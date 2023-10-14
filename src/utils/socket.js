const { readFileSync } = require("fs");
const { createServer: createHttpsServer } = require("https");
const { createServer: createHttpServer } = require("http");
const { Server } = require("socket.io");
const { PORT } = require("../services");
const { clients, userInfoMap, rooms } = require("../../config/database");
const { debounce } = require("./util");

const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

const MessageEventName = {
  OFFER: "offer",
  ANSWER: "answer",
  GET_OFFER: "getOffer",
  ICE_CANDIDATE: "icecandidate",
  LEAVE: "leave",
  JOIN: "join",
  RECONNECT: "reconnect",
  RECONNECT_WORK: "reconnectWork",
  ERROR: "error",
}

const ErrorMessageType = {
  REPEAT: 'repeat'
}

const ErrorMessage = {
  repeat: '此房间该用户名已存在'
}

const UserState = {
  JOIN: "join",
  LEAVE: "leave",
}

const StreamTypeEnum = {
  USER: 'user',
  DISPLAY: 'display',
  REMOTE_DISPLAY: 'remoteDisplay',
}

const clearTime = 1000 * 15;

function createSocket (app) {
  const httpServer = isDev ? createHttpServer(app) : createHttpsServer({
    key: readFileSync(path.join(__dirname, '../../../app.rtcchatroom.cn.key')),
    cert: readFileSync(path.join(__dirname, '../../../app.rtcchatroom.cn.pem'))
  }, app);
  const io = new Server(httpServer, { cors: true });
  
  io.on('connection', (socket) => {
    console.log('A client connected:', socket.id);

    const [ leave, cancel ] = debounce(leaveRoom, clearTime)

    initSocket(socket, clients, cancel);

    // 当客户端断开连接时，从客户端列表中删除
    socket.on('disconnect', () => {
      const client = clients[socket.id]
      const userId = client.userId;
      leave(userId, true);
      delete clients[socket.id];
      console.log(`Client disconnected: ${socket.id}`);
      log('所有房间', rooms)
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`${isDev ? 'http' : 'https'}://localhost:${PORT}/`);
  });
};

function initSocket (socket, clients, cancel) {
  const client = {
    id: socket.id,
    socket,
  }
  // offer SDP 交换
  socket.on(MessageEventName.OFFER, (data) => {
    const { connectorId, offer, memberId: socketId, streamType } = data
    const connectorClient = clients[socketId];
    if (!connectorClient) return

    const userId = connectorClient.userId
    const userInfo = userInfoMap[userId]
    const connectorMap = userInfo[streamType] = userInfo[streamType] || new Map()
    connectorMap.set(connectorId, client)

    connectorClient.socket.emit(MessageEventName.OFFER, {
      remoteConnectorId: connectorId,
      offer,
      memberId: socket.id,
      streamType
    })
  })
  // answer SDP 交换
  socket.on(MessageEventName.ANSWER, (data) => {
    const { remoteConnectorId, connectorId, answer, memberId: socketId, streamType } = data
    const connectorClient = clients[socketId];
    if (!connectorClient) return
    
    const userId = connectorClient.userId
    const userInfo = userInfoMap[userId]
    const connectorMap = userInfo[streamType] = userInfo[streamType] || new Map()
    connectorMap.set(connectorId, client)

    connectorClient.socket.emit(MessageEventName.ANSWER, {
      remoteConnectorId: connectorId,
      connectorId: remoteConnectorId,
      answer,
      memberId: socket.id
    })
  })
  // icecandidate 交换
  socket.on(MessageEventName.ICE_CANDIDATE, (data) => {
    const { remoteConnectorId, memberId: socketId, candidate } = data
    const connectorClient = clients[socketId];
    if (!connectorClient) return
    connectorClient.socket.emit(MessageEventName.ICE_CANDIDATE, {
      connectorId: remoteConnectorId,
      candidate
    })
  })

  // 加入房间
  socket.on(MessageEventName.JOIN, join)
  function join(data) {
    const { id, username, roomname } = data
    const room = rooms[roomname] = rooms[roomname] || {}
    const isRepeat = Object.keys(room).some(id => {
      return room[id].username === username
    })
    if (isRepeat) {
      socket.emit(MessageEventName.ERROR, {
        type: ErrorMessageType.REPEAT,
        message: ErrorMessage[ErrorMessageType.REPEAT]
      })
      return
    }
    client.userId = id
    const userInfo = {
      id,
      username,
      roomname,
      socketId: socket.id,
      cancel
    }
    userInfoMap[id] = userInfo

    Object.keys(room).forEach(id => {
      const { socketId } = room[id]
      const connectorClient = clients[socketId];
      if (!connectorClient) return
      connectorClient.socket.emit(MessageEventName.GET_OFFER, { memberId: socket.id });
    })
    room[id] = userInfo
    log('所有房间', rooms)
  }

  // 重新连接
  socket.on(MessageEventName.RECONNECT, (data) => {
    const { id, roomname } = data
    const userInfo = userInfoMap[id]
    if (!userInfo) {
      socket.emit(MessageEventName.RECONNECT, {type: UserState.LEAVE})
      join(data)
      return
    }
    userInfo.cancel()
    userInfo.cancel = cancel
    
    const room = rooms[roomname]
    const inRoomClients = Object.keys(room).map((userId) => {
      const { socketId } = room[userId]
      const connectorClient = clients[socketId];
      return connectorClient
    }).filter(client => !!client)

    const connectorClients = Object.keys(StreamTypeEnum).map(key => {
      const type = StreamTypeEnum[key]
      const entries = [...(userInfo[type]?.entries() || [])]
      return entries.map(entrie => [type, ...entrie])
    }).flat()

    // 新加入的成员
    inRoomClients.forEach(client => {
      if (!connectorClients.some(item => item[2] === client)) {
        client.socket.emit(MessageEventName.GET_OFFER, { memberId: socket.id });
      }
    })
    // 旧成员
    connectorClients.forEach(([streamType, connectorId, client]) => {
      // 还在房间的
      if (inRoomClients.some(item => item === client)) {
        console.log('client', client.id)
        client.socket.emit(MessageEventName.RECONNECT, {
          type: MessageEventName.GET_OFFER,
          connectorId
        })
      } else {
        // 不在房间或断网的
        userInfo[streamType].delete(connectorId)
        socket.emit(MessageEventName.RECONNECT, {
          type: UserState.LEAVE,
          memberId: client.id
        })
      }
    })

    userInfo.socketId = socket.id
    client.userId = id
  })

  socket.on(MessageEventName.RECONNECT_WORK, (body) => {
    const { type, data, connectorId, memberId: socketId } = body
    const connectorClient = clients[socketId];
    if (!connectorClient) return
    connectorClient.socket.emit(MessageEventName.RECONNECT, {
      type,
      data,
      connectorId,
      memberId: socketId
    })
  })

  // 退出房间
  socket.on(MessageEventName.LEAVE, (dataList) => {
    const userId = client.userId
    if (!userId) return
    leaveRoom(userId)
    dataList.forEach((data) => {
      const { remoteConnectorId: connectorId, memberId: socketId } = data
      const connectorClient = clients[socketId];
      if (!connectorClient) return
      connectorClient.socket.emit(MessageEventName.LEAVE, { connectorId, memberId: socket.id })
    })
    log('所有房间', rooms)
  })

  clients[socket.id] = client
}

function leaveRoom(userId, needSend = false) {
  if (!userId) return
  const userInfo = userInfoMap[userId]
  if (!userInfo) return
  const roomname = userInfo.roomname
  const room = rooms[roomname]
  delete room[userId]
  delete userInfoMap[userId]
  if (!Object.keys(room).length) {
    delete rooms[roomname]
  } else if (needSend) {
    sendLeaveMessage(userInfo)
  }
  console.log('退出')
}

function sendLeaveMessage(userInfo) {
  Object.keys(StreamTypeEnum).forEach(key => {
    const type = StreamTypeEnum[key]
    const connectorMap = userInfo[type]
    connectorMap?.forEach((connectorClient, connectorId) => {
      try {
        connectorClient.socket.emit(MessageEventName.LEAVE, {
          connectorId, memberId: userInfo.socketId
        })
      } catch (error) {
        console.error(error)
      }
    })
  })
}

function log(desc, data) {
  console.log(desc, data);
}

module.exports = {
  createSocket
}
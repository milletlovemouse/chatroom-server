# chatroom-server
A simple server that supports front-end exercise projects
## start
```shell
#npm
npm install

npm run start
#yarn
yarn install

yarn start
#pnpm
pnpm install

pnpm start
```
## Socket Server Events
### offer
```javascript
socket.on(MessageEventName.OFFER, (data) => {
  const { connectorId, offer, memberId, streamType } = data
  // ...
})
```
### answer
```javascript
socket.on(MessageEventName.ANSWER, (data) => {
  const { remoteConnectorId, connectorId, answer, memberId, streamType } = data
  // ...
})
```
### icecandidate
```javascript
socket.on(MessageEventName.ICE_CANDIDATE, (data) => {
  const { remoteConnectorId, memberId, candidate } = data
  // ...
})
```
### join
```javascript
socket.on(MessageEventName.JOIN, (data) => {
  const { id, username, roomname } = data
  // ...
}
```
### leave
```javascript
socket.on(MessageEventName.LEAVE, (dataList) => {
  dataList.forEach((data) => {
    const { remoteConnectorId, memberId } = data
    // ...
  })
  // ...
}
```
### reconnect
```javascript
socket.on(MessageEventName.RECONNECT, (data) => {
  const { id, roomname } = data
  // ...
}
```
### reconnectWork
```javascript
socket.on(MessageEventName.RECONNECT_WORK, (data) => {
  const { type, data, connectorId, memberId } = data
  // ...
}
```
## Socket Client Events
### getOffer
```javascript
socket.emit(MessageEventName.GET_OFFER, { memberId })
```
### offer
```javascript
socket.emit(MessageEventName.OFFER, {
  remoteConnectorId,
  offer,
  memberId,
  streamType
})
```
### answer
```javascript
emit(MessageEventName.ANSWER, {
  remoteConnectorId,
  connectorId,
  answer,
  memberId
})
```
### icecandidate
```javascript
socket.emit(MessageEventName.ICE_CANDIDATE, {
  connectorId,
  candidate
})
```
### reconnect
```javascript
socket.emit(MessageEventName.RECONNECT, {
  type,
  data,
  connectorId,
  memberId,
})
```
### leave
```javascript
socket.emit(MessageEventName.LEAVE, {
  connectorId,
  memberId
})
```
### error
```javascript
socket.emit(MessageEventName.ERROR, {
  type,
  message
})
```
## Property
| Property    | Description | Type |
| ----------- | ----------- | ---- |
| connectorId | 对应发送者客户端点对点连接id | string |
| remoteConnectorId | 对应远程客户端点对点连接id | string |
| memberId | 对应远程连接者在服务器的socketId | string |
| offer | 对方发送的offer SDP | RTCSessionDescriptionInit |
| answer | 对方发送的answer SDP | RTCSessionDescriptionInit |
| candidate | 对方发送的ice candidate | RTCIceCandidate |
| streamType | 客户端需要的连接类型 | `user` 或 `display` 或 `remoteDisplay` |
| id | 客户端用户id | string |
| username | 客户端用户名 | string |
| roomname | 客户端用户要加入的房间名 | string |
| type | reconnect事件的type：重连的事件类型；error事件的type：错误的事件类型； | `offer` 或 `answer` 或 `icecandidate` 或 `getOffer` 或 `leave` |
| data | 重连事件携带的数据 | `object: {`<br>&emsp;`offer?: RTCSessionDescriptionInit,`<br>&emsp;`answer?: RTCSessionDescriptionInit`<br> `}` |
| message | 发送给客户端的消息 | string |
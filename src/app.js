const { createApp } = require('./services')
const { creatRouter } = require('./router')
const { middlewares } = require('./middlewares')
const { createSocket } = require('./utils/socket')

function bootstrap() {
  const app = createApp(middlewares)

  creatRouter(app)

  createSocket(app)
}

bootstrap()
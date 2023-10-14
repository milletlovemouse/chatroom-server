const bodyParser = require('body-parser');

function useMiddlewares(app) {
  app.use(bodyParser.json());
  app.use((req, res, next) => {
    next();
  });
}

module.exports = {
  middlewares: [
    useMiddlewares
  ]
};
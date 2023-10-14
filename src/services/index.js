const express = require('express');

const PORT = 3000;
function createApp(middlewares) {
  const app = express();
  middlewares.forEach(use => {
    use(app)
  });
  return app
}

module.exports = {
  createApp,
  PORT
};
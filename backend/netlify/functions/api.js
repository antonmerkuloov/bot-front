const serverless = require('serverless-http');
// Путь: мы выходим из netlify/functions на два уровня вверх, где лежит server.js
const app = require('../../server'); 

module.exports.handler = serverless(app);
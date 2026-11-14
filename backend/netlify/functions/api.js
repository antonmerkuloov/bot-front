const serverless = require('serverless-http');
// Теперь require вернет сам Express-app, так как мы добавили module.exports
const app = require('../../server'); 

module.exports.handler = serverless(app);
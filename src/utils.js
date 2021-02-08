const winston = require('winston');

// timestamp for logger
const tsFormat = () => (new Date()).toLocaleTimeString();

// Initialize winston logger.
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [
    new (winston.transports.Console)({
      timestamp: tsFormat,
      colorize: true,
      level: 'info'
    }),
    new winston.transports.File({filename: 'bitcoin-app.log', colorize: true})
  ]
});

module.exports = {
  logger: logger
};
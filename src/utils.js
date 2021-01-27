const winston = require('winston');

// timestamp for logger
const tsFormat = () => (new Date()).toLocaleTimeString();

// Initialize winston logger.
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log`
    // - Write all logs error (and below) to `error.log`.
    //
    new (winston.transports.Console)({
      timestamp: tsFormat,
      colorize: true,
      level: 'info'
    }),
    new winston.transports.File({filename: 'error.log', level: 'error', colorize: true}),
    new winston.transports.File({filename: 'combined.log'})
  ]
});

module.exports = {
  logger: logger
};
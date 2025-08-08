const winston = require('winston');
const path = require('path');
const { config } = require('../config');

// Create logs directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync(config.paths.logs)) {
    fs.mkdirSync(config.paths.logs, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({
        format: 'HH:mm:ss'
    }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: config.env === 'development' ? 'debug' : 'info',
    format: logFormat,
    defaultMeta: { service: 'competitors-analysis-agent' },
    transports: [
        // Write all logs to console
        new winston.transports.Console({
            format: config.env === 'development' ? consoleFormat : logFormat
        }),

        // Write all logs with level 'error' and below to error.log
        new winston.transports.File({
            filename: path.join(config.paths.logs, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),

        // Write all logs with level 'info' and below to combined.log
        new winston.transports.File({
            filename: path.join(config.paths.logs, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),

        // Write analysis-specific logs to analysis.log
        new winston.transports.File({
            filename: path.join(config.paths.logs, 'analysis.log'),
            level: 'info',
            maxsize: 5242880, // 5MB
            maxFiles: 10
        })
    ]
});

// If we're not in production, log to the console with the simple format
if (config.env !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Create a stream object for Morgan HTTP logging
logger.stream = {
    write: (message) => {
        logger.info(message.trim());
    }
};

// Helper methods for specific log types
logger.analysis = (message, meta = {}) => {
    logger.info(message, { ...meta, type: 'analysis' });
};

logger.competitor = (competitor, message, meta = {}) => {
    logger.info(message, { ...meta, type: 'competitor', competitor });
};

logger.error = (message, error = null, meta = {}) => {
    if (error) {
        logger.log('error', message, {
            ...meta,
            error: error.message,
            stack: error.stack
        });
    } else {
        logger.log('error', message, meta);
    }
};

logger.api = (endpoint, method, status, duration, meta = {}) => {
    logger.info(`${method} ${endpoint} - ${status} (${duration}ms)`, {
        ...meta,
        type: 'api',
        endpoint,
        method,
        status,
        duration
    });
};

module.exports = logger; 
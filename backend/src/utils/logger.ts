import winston from 'winston';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

winston.addColors(colors);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    errors({ stack: true }),
    json()
  ),
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        simple()
      )
    }),
    
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

// Create logs directory if it doesn't exist
import { promises as fs } from 'fs';
import path from 'path';

const createLogsDirectory = async () => {
  const logsDir = path.join(process.cwd(), 'logs');
  try {
    await fs.access(logsDir);
  } catch {
    await fs.mkdir(logsDir, { recursive: true });
  }
};

createLogsDirectory().catch(console.error);

// HTTP request logger middleware
export const httpLogger = winston.createLogger({
  level: 'http',
  format: combine(
    timestamp(),
    json()
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        simple()
      )
    }),
    new winston.transports.File({
      filename: 'logs/http.log',
      maxsize: 5242880,
      maxFiles: 3
    })
  ]
});

// Performance logger
export const performanceLogger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/performance.log',
      maxsize: 5242880,
      maxFiles: 3
    })
  ]
});

// Security logger
export const securityLogger = winston.createLogger({
  level: 'warn',
  format: combine(
    timestamp(),
    json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/security.log',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// Queue logger
export const queueLogger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    json()
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        simple()
      )
    }),
    new winston.transports.File({
      filename: 'logs/queue.log',
      maxsize: 5242880,
      maxFiles: 3
    })
  ]
});

// Export default logger
export default logger;
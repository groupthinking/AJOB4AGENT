/**
 * Logger utility for Form Fill Engine
 * Winston-based logging with structured output
 */

import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const customFormat = printf(({ level, message, timestamp, service, ...metadata }) => {
  let msg = `${timestamp} [${service || 'form-fill-engine'}] ${level}: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    // Filter out symbol keys and undefined values
    const cleanMetadata: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined && typeof key === 'string') {
        cleanMetadata[key] = value;
      }
    }
    if (Object.keys(cleanMetadata).length > 0) {
      msg += ` ${JSON.stringify(cleanMetadata)}`;
    }
  }
  
  return msg;
});

export interface LoggerOptions {
  level?: string;
  service?: string;
  silent?: boolean;
}

export function createLogger(options: LoggerOptions = {}): winston.Logger {
  const { level = 'info', service = 'form-fill-engine', silent = false } = options;

  return winston.createLogger({
    level,
    silent,
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true })
    ),
    defaultMeta: { service },
    transports: [
      new winston.transports.Console({
        format: combine(
          colorize(),
          customFormat
        )
      })
    ]
  });
}

// Default logger instance
export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info'
});

// Child logger factory for component-specific logging
export function createComponentLogger(component: string): winston.Logger {
  return logger.child({ component });
}

export default logger;

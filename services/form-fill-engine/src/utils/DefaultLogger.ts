import { FormFillLogger } from '../types';

/**
 * Default logger implementation that wraps console
 * Provides a consistent interface for the FormFillLogger
 */
export class DefaultLogger implements FormFillLogger {
  private readonly prefix: string;

  constructor(prefix: string = 'FormFillEngine') {
    this.prefix = prefix;
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (meta) {
      console.info(`[${this.prefix}] ${message}`, meta);
    } else {
      console.info(`[${this.prefix}] ${message}`);
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (meta) {
      console.warn(`[${this.prefix}] ${message}`, meta);
    } else {
      console.warn(`[${this.prefix}] ${message}`);
    }
  }

  error(message: string, meta?: Record<string, unknown>): void {
    if (meta) {
      console.error(`[${this.prefix}] ${message}`, meta);
    } else {
      console.error(`[${this.prefix}] ${message}`);
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (meta) {
      console.debug(`[${this.prefix}] ${message}`, meta);
    } else {
      console.debug(`[${this.prefix}] ${message}`);
    }
  }
}

/**
 * Creates a default logger instance
 */
export function createDefaultLogger(prefix?: string): FormFillLogger {
  return new DefaultLogger(prefix);
}

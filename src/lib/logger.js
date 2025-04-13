/**
 * Custom logger for the API with colored output using chalk
 */
import chalk from 'chalk';

/**
 * Log an info message
 * @param {string} message - The message to log
 * @param {Object} data - Additional data to log
 */
const info = (message, data = {}) => {
  console.log(chalk.blue(`[INFO] ${message}`), Object.keys(data).length ? data : '');
};

/**
 * Log an error message
 * @param {string} message - The error message
 * @param {Error|Object} error - The error object or data
 */
const error = (message, error = {}) => {
  console.error(chalk.red(`[ERROR] ${message}`), error instanceof Error ? error.stack : error);
};

/**
 * Log a debug message (only in development)
 * @param {string} message - The debug message
 * @param {Object} data - Additional data to log
 */
const debug = (message, data = {}) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(chalk.yellow(`[DEBUG] ${message}`), Object.keys(data).length ? data : '');
  }
};

/**
 * Log a success message
 * @param {string} message - The success message
 * @param {Object} data - Additional data to log
 */
const success = (message, data = {}) => {
  console.log(chalk.green(`[SUCCESS] ${message}`), Object.keys(data).length ? data : '');
};

export default {
  info,
  error,
  debug,
  success
};

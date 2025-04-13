/**
 * Application configuration helpers
 */

/**
 * Get a configuration value from environment variables with fallback
 * @param {string} key - The configuration key
 * @param {any} defaultValue - Default value if not found
 * @returns {any} The configuration value
 */
const get = (key, defaultValue = null) => {
  return process.env[key] || defaultValue;
};

/**
 * Check if the application is running in production mode
 * @returns {boolean} Whether the app is in production
 */
const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Get the current environment
 * @returns {string} The current environment
 */
const getEnvironment = () => {
  return process.env.NODE_ENV || 'development';
};

module.exports = {
  get,
  isProduction,
  getEnvironment
};

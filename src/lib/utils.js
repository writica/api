/**
 * Utility functions for the API
 */

/**
 * Format a response object
 * @param {boolean} success - Whether the operation was successful
 * @param {string} message - Message describing the result
 * @param {any} data - The data to return
 * @returns {Object} Formatted response object
 */
const formatResponse = (success, message, data = null) => {
  return {
    success,
    message,
    data,
    timestamp: new Date()
  };
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Whether the email is valid
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

module.exports = {
  formatResponse,
  isValidEmail
};

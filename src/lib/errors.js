// filepath: e:\javascript\write-to-earn-api\src\lib\errors.js
/**
 * Custom error class for user-facing errors
 * @class UserError
 * @extends Error
 */
export class UserError extends Error {
  /**
   * Creates a new UserError
   * @param {string} message - Error message
   */
  constructor(message) {
    super(message);
    this.name = 'UserError';
  }
}

export default {
  UserError
};

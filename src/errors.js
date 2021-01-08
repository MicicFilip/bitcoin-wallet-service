/**
 * Extends the Error object with additional features.
 * @param {int} errorCode -- Internal error code used for debugging application.
 * @param {string} message -- Custom message for this error.
 * @param {int} statusCode -- HTTP Status Code if we're returning it to the user
 */
class HttpError {
  constructor(statusCode, message) {
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.message = message;
  }
}

module.exports = {
  HttpError: HttpError
}
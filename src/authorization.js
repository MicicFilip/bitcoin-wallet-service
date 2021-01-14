const jwt = require('jsonwebtoken');
const status = require('http-status');
const { HttpError } = require('./errors');
const { DEFAULT_USER_ROLE, ADMIN_USER_ROLE } = require('./users/consts');

/**
 * Abstraction over JWT signing.
 * @name sign
 * @param {Object} payload - Data of the user.
 * @return {string} Signed JWT.
 */
async function sign(payload) {
  try {
    return await jwt.sign({
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24),  // Token valid for one day.
      data: {
        id: payload.id,
        email: payload.email,
        role: payload.role,
      }
    }, process.env.JWT_SECURITY_PASSWORD);
  } catch (err) {
    throw new HttpError(status.BAD_REQUEST, 'Authorization failed.');
  }
}

/**
 * Abstraction over JWT verification.
 * @name authorize
 * @param {string} authorizationHeader Authorization header string.
 * @param {string} neededUserRole needed user role for requested resorce.
 * @return {object} Verified JWT data.
 */
async function authorize(authorizationHeader, neededUserRole = DEFAULT_USER_ROLE) {
  // Check if `Authorization` header has been provided in the request.
  if (!authorizationHeader) {
    throw new HttpError(
      status.BAD_REQUEST, 'Authorization header not provided in the request.'
    );
  }

  let tokenPayload;
  try {
    const token = authorizationHeader.split(' ')[1];
    tokenPayload = await jwt.verify(token, process.env.JWT_SECURITY_PASSWORD);
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      throw new HttpError(
        status.INTERNAL_SERVER_ERROR, 'JWT token malformed'
      );
    }
    throw new HttpError(status.BAD_REQUEST, 'Verification failed');
  }

  // Verify if user has access to this resource.
  // User needs to have needed user role to access wanted resource, or
  // to be an `admin` user.
  const tokenUserRole = tokenPayload.data.role;
  if (tokenUserRole === neededUserRole
    || tokenUserRole === ADMIN_USER_ROLE) {
    return tokenPayload;
  }

  throw new HttpError(status.FORBIDDEN, 'You do not have access to this resource.');
}


module.exports = {
  sign: sign,
  authorize: authorize
};
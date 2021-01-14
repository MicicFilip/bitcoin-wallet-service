const express = require('express');
const status = require('http-status');
const pg = require('./db');
const jwt = require('../authorization');
const { ADMIN_USER_ROLE } = require('./consts');
const {
  userRegisterSchema,
  userLoginSchema,
  userCreateSchema
} = require('./schemas');

const router = express.Router();

/* POST user registration */
router.post('/register', async (request, reply) => {
  // Validate incoming payload for user registration.
  let requestData;
  try {
    requestData = await userRegisterSchema.validateAsync(request.body)
  } catch (err) {
    return reply.status(status.BAD_REQUEST).send({ message: err.message });
  }

  // Register user in the system.
  let createdUser;
  try {
    createdUser = await pg.registerUser(requestData);
  } catch (err) {
    return reply.status(err.statusCode).send({ message: err.message });
  }

  return reply.status(status.OK).send(createdUser);
});

/* POST user login */
router.post('/login', async (request, reply) => {
  // Validate incoming payload for user login.
  let requestData;
  try {
    requestData = await userLoginSchema.validateAsync(request.body);
  } catch (err) {
    return reply.status(status.BAD_REQUEST).send({ message: err.message });
  }

  // Checks if the user exists and if provided password and stored password match.
  // If they match we authorize user by generating a JWT token and returning it
  // in the response of the request.
  let jwtToken;
  try {
    const user = await pg.verifyUserCredentials(requestData);
    jwtToken = await jwt.sign(user);
  } catch (err) {
    return reply.status(err.statusCode).send({ message: err.message });
  }

  return reply.status(status.OK).send({ token: jwtToken });
});

/* GET logged in user details. */
router.get('/me', async (request, reply) => {
  // Verify integrity of JWT Token and authorized user.
  let tokenPayload;
  try {
    tokenPayload = await jwt.verify(request.headers['authorization']);
  } catch (err) {
    return reply.status(err.statusCode).send({ message: err.message });
  }

  // Retrieve user from the database.
  const user = await pg.getUserById(tokenPayload.data.id);
  // Remove password from user object, because security.
  delete user.password;

  return reply.status(status.OK).send(user);
});

/* GET users list route available for administrator users. */
router.get('/', async (request, reply) => {
  // Authorize user using JWT token, and check if that user has `admin` role.
  try {
    await jwt.authorize(request.headers['authorization'], ADMIN_USER_ROLE);
  } catch (err) {
    return reply.status(err.statusCode).send({ message: err.message });
  }

  // Get current pagination page.
  const currentPage = Number(request.query.page) || 1;
  // Paginate users table.
  const results = await pg.paginateUsers(currentPage);
  return reply.status(status.OK).send(results);
});

/* POST add new user route, available for administrator users. */
router.post('/', async (request, reply) => {
  // Authorize user using JWT token, and check if that user has `admin` role.
  try {
    await jwt.authorize(request.headers['authorization'], ADMIN_USER_ROLE);
  } catch (err) {
    return reply.status(err.statusCode).send({ message: err.message });
  }

  // Validate incoming payload for user creation.
  let requestData;
  try {
    requestData = await userCreateSchema.validateAsync(request.body);
  } catch (err) {
    return reply.status(status.BAD_REQUEST).send({ message: err.message });
  }

  // Create new user in the system.
  let createdUser;
  try {
    createdUser = await pg.registerUser(requestData, requestData.role);
  } catch (err) {
    return reply.status(err.statusCode).send({ message: err.message });
  }

  return reply.status(status.OK).send(createdUser);
});

/* GET specific user by id route available for administrator users. */
router.get('/:id', async (request, reply) => {
  // Authorize user using JWT token, and check if that user has `admin` role.
  try {
    await jwt.authorize(request.headers['authorization'], ADMIN_USER_ROLE);
  } catch (err) {
    return reply.status(err.statusCode).send({ message: err.message });
  }

  // Retrieve user from the database by id.
  const user = await pg.getUserById(request.params.id);
  // Remove password from user object, because security.
  delete user.password;

  return reply.status(status.OK).send(user);
});



// TODO: Add route for updating users.

module.exports = router;
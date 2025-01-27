const { knex } = require('../db/config');
const status = require('http-status');
const bcrypt = require('bcrypt');
const { HttpError } = require('../errors');
const { USER_TABLE_NAME } = require('./tables');
const { DEFAULT_USER_ROLE } = require('./consts');
const { BALANCE_TABLE_NAME } = require('../bitcoin/tables');


/**
 * Retrieves user by email address.
 * @name getUserByEmail
 * @param {string} email User email which we check in database.
 * @return {object} User object with properties.
 */
async function getUserByEmail(email) {
  const user = await knex.select(
    'id', 'first_name', 'last_name',
    'email', 'password', 'role'
  )
  .from(USER_TABLE_NAME)
  .where('email', email);

  return user[0];
}

/**
 * Retrieves user by id.
 * @name getUserById
 * @param {string} id User id which we check in database.
 * @return {object} User object with properties.
 */
async function getUserById(id) {
  const user = await knex.select(
    'id', 'first_name', 'last_name', 'email', 'password',
    'role', 'last_login_ip', 'created_at', 'updated_at'
  )
  .from(USER_TABLE_NAME)
  .where('id', id);

  return user[0];
}

/**
 * As the name suggest - user creation.
 * @name createUser
 * @param {object} payload - User registration data.
 * @return {object} 'id', 'first_name', 'last_name', 'email', 'role'.
 * @err {object} HttpError
 */
async function createUser(payload) {
  // Check if user exists in the system.
  const user = await getUserByEmail(payload.email);
  if (user) {
    throw new HttpError(
      status.BAD_REQUEST, `User with ${payload.email} already exists.`
    );
  }

  const hashedPassword = await bcrypt.hash(payload.password, Number(process.env.PASSWORD_SALT));
  try {
    const createdUser = await knex(USER_TABLE_NAME)
    .insert({
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email,
      password: hashedPassword,
      role: payload.role || DEFAULT_USER_ROLE
    })
    .returning(['id', 'first_name', 'last_name', 'email', 'role']);

    return createdUser[0];
  } catch (err) {
    throw new HttpError(
      status.INTERNAL_SERVER_ERROR, 'Something went wrong with registering user.'
    );
  }
}

/**
 * Creates default user balance on user registration.
 * @name createUserBalance
 * @param {number} userId - id of the user
 * @return {object} 'id', 'unconfirmed_balance', 'confirmed_balance', 'user_id', 'created_at'.
 * @err {object} HttpError
 */
async function createUserBalance(userId) {
  const createdBalance = await knex(BALANCE_TABLE_NAME)
  .insert({
    user_id: userId
  })
  .returning(['id', 'unconfirmed_balance', 'confirmed_balance', 'user_id', 'created_at']);

  return createdBalance[0];
}

/**
 * Updates existing users in the system.
 * @name updateUser
 * @param {number} userId - id of the user
 * @param {object} payload - user update data.
 * @return {object} 'id', 'first_name', 'last_name', 'email', 'role'.
 * @err {object} HttpError
 */
async function updateUser(userId, payload) {
  // If password is being updated, we need to hash it in order to save it.
  if (payload.password) {
    payload.password = await bcrypt.hash(payload.password, Number(process.env.PASSWORD_SALT));
  }

  // Update specific user with new data.
  try {
    const updatedUser = await knex(USER_TABLE_NAME)
    .where({ id: userId })
    .update(payload, ['id', 'first_name', 'last_name', 'email', 'role']);

    return updatedUser[0];
  } catch (err) {
    throw new HttpError(
      status.INTERNAL_SERVER_ERROR, 'Something went wrong with updating user.'
    );
  }
}

/**
 * Verifies if the user exists and if the provided passwords match.
 * @name verifyUserCredentials
 * @param {object} payload - User login data.
 * @return {object} 'id', 'first_name', 'last_name', 'email'.
 * @err {object} HttpError
 */
async function verifyUserCredentials(payload) {
  // Check if user exists in the system.
  const user = await getUserByEmail(payload.email);
  if (!user) {
    throw new HttpError(status.NOT_FOUND, 'User does not exist.');
  }
  // Compare password from incoming request and with stored password in the system.
  const matchPassword = await bcrypt.compare(payload.password, user.password);
  if (!matchPassword) {
    throw new HttpError(status.BAD_REQUEST, 'Email or password incorrect');
  }

  return user;
}

/**
 * Paginates user table.
 * @name paginateUsers
 * @param {object} currentPage - Current page set for pagination.
 * @return {object} Database entries count and User objects.
 * @err {object} HttpError
 */
async function paginateUsers(currentPage) {
  // Paginate over users table.
  const usersResult = await knex
  .select(
    'id', 'first_name', 'last_name', 'email', 'role',
    'last_login_ip', 'created_at', 'updated_at'
  )
  .from(USER_TABLE_NAME)
  .paginate({
    perPage: 20,
    currentPage: currentPage
  });
    // Return count and entries for retrieved users list.
    return {
      count: usersResult.pagination.total || 0,
      currentPage: usersResult.pagination.currentPage || null,
      lastPage: usersResult.pagination.lastPage || null,
      results: usersResult.data
    };
}

module.exports = {
  createUser: createUser,
  createUserBalance: createUserBalance,
  updateUser: updateUser,
  verifyUserCredentials: verifyUserCredentials,
  getUserById: getUserById,
  paginateUsers: paginateUsers
}
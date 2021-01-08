const { DEFAULT_USER_ROLE } = require('./consts');

const USER_TABLE_NAME = 'user';

async function userTable(knex) {
  return await knex.schema.withSchema('public').
    createTable(USER_TABLE_NAME, user => {
      user.increments('id').primary();
      user.string('first_name', 35).notNullable();
      user.string('last_name', 35).notNullable();
      user.string('email', 100).unique().notNullable();
      user.string('password', 254).notNullable();
      user.string('role', 15).notNullable().defaultTo(DEFAULT_USER_ROLE);
      user.string('last_login_ip', 39).nullable().defaultTo(null);
      user.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      user.timestamp('updated_at').nullable().defaultTo(null);
  });
}

module.exports = {
  USER_TABLE_NAME: USER_TABLE_NAME,
  userTable: userTable
};
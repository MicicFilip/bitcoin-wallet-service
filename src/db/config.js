// Initialize connection to PostgreSQL using knexjs.
const knex = require('knex')({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'postgres',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'qwerty'
  }
});

// Initialize knex pagination.
require('knex-paginate').attachPaginate();

module.exports = {
  knex: knex
}
const BLOCK_HISTORY_TABLE_NAME = 'block_history';

async function blockHistoryTable(knex) {
  return await knex.schema.withSchema('public').
    createTable(BLOCK_HISTORY_TABLE_NAME, user => {
      user.increments('id').primary();
      user.string('block_hash', 56).notNullable().unique();
      user.integer('block_height', 35).notNullable().unique();
      user.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
}

module.exports = {
  USER_TABLE_NAME: USER_TABLE_NAME,
  blockHistoryTable: blockHistoryTable
};
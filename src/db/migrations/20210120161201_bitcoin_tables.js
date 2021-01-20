const {
  BLOCK_HISTORY_TABLE_NAME,
  blockHistoryTable,
  ADDRESS_TABLE_NAME,
  addressTable,
  TRANSACTION_TABLE_NAME,
  transactionTable
} = require('../../bitcoin/tables');

// Migrate UP block history tables.
exports.up = async function(knex) {
  try {
    await blockHistoryTable(knex);
    await addressTable(knex);
    await transactionTable(knex);

    return true;
  } catch (err) {
    throw err;
  }
};

// Migrate DOWN block history tables.
exports.down = async function(knex) {
  try {
    await knex.schema.dropTable(BLOCK_HISTORY_TABLE_NAME);
    await knex.schema.dropTable(ADDRESS_TABLE_NAME);
    await knex.schema.dropTable(TRANSACTION_TABLE_NAME);

    return true;
  } catch (err) {
    throw err;
  }
};

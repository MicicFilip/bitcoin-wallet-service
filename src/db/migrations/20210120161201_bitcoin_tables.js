const {
  BLOCK_HISTORY_TABLE_NAME,
  blockHistoryTable,
  ADDRESS_TABLE_NAME,
  addressTable,
  TRANSACTION_TABLE_NAME,
  transactionTable,
  BALANCE_TABLE_NAME,
  balanceTable
} = require('../../bitcoin/tables');

const blockHistory = require('../seeds/blockHistory');

// Migrate UP block history tables.
exports.up = async function(knex) {
  try {
    await blockHistoryTable(knex);
    await addressTable(knex);
    await transactionTable(knex);
    await balanceTable(knex);

    await blockHistory.seed(knex);
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
    await knex.schema.dropTable(BALANCE_TABLE_NAME);

    return true;
  } catch (err) {
    throw err;
  }
};

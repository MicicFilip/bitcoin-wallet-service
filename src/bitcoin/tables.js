const { USER_TABLE_NAME } = require('../users/tables');
const {
  TRANSACTION_TYPE,
  TRANSACTION_STATUS
} = require('./consts');

const BLOCK_HISTORY_TABLE_NAME = 'block_history';

async function blockHistoryTable(knex) {
  return await knex.schema.withSchema('public').
    createTable(BLOCK_HISTORY_TABLE_NAME, blockHistory => {
      blockHistory.increments('id').primary();
      blockHistory.string('block_hash', 64).notNullable().unique();
      blockHistory.integer('block_height', 35).notNullable().unique();
      blockHistory.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
}

const ADDRESS_TABLE_NAME = 'address';

async function addressTable(knex) {
  return await knex.schema.withSchema('public').
    createTable(ADDRESS_TABLE_NAME, address => {
      address.increments('id').primary();
      address.string('public_key', 35).unique().notNullable();
      address.decimal('unconfirmed_balance', 16, 8).nullable().defaultTo(0);
      address.decimal('confirmed_balance', 16, 8).nullable().defaultTo(0);
      address.bigInteger('user_id')
        .notNullable()
        .index()
        .references('id')
        .inTable(USER_TABLE_NAME);
      address.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
}

const TRANSACTION_TABLE_NAME = 'transaction';

async function transactionTable(knex) {
  return await knex.schema.withSchema('public').
    createTable(TRANSACTION_TABLE_NAME, transaction => {
      transaction.increments('id').primary();
      transaction.enu('type', Object.values(TRANSACTION_TYPE)).notNullable();
      transaction.enu('status', Object.values(TRANSACTION_STATUS)).notNullable();
      transaction.string('transaction_id').notNullable();
      transaction.string('block_id').notNullable();
      transaction.decimal('amount_received', 16, 8).notNullable();
      transaction.integer('transaction_timestamp').notNullable();
      transaction.string('public_key', 35).notNullable();
      transaction.bigInteger('user_id')
        .notNullable()
        .index()
        .references('id')
        .inTable(USER_TABLE_NAME);
      transaction.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });
}

module.exports = {
  BLOCK_HISTORY_TABLE_NAME: BLOCK_HISTORY_TABLE_NAME,
  blockHistoryTable: blockHistoryTable,
  ADDRESS_TABLE_NAME: ADDRESS_TABLE_NAME,
  addressTable: addressTable,
  TRANSACTION_TABLE_NAME: TRANSACTION_TABLE_NAME,
  transactionTable: transactionTable
};
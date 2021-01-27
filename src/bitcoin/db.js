const { knex } = require('../db/config');
const { HttpError } = require('../errors');
const status = require('http-status');
const { USER_TABLE_NAME } = require('../users/tables');
const {
  BLOCK_HISTORY_TABLE_NAME,
  ADDRESS_TABLE_NAME,
  TRANSACTION_TABLE_NAME
} = require('./tables');
const {
  TRANSACTION_TYPE,
  TRANSACTION_STATUS
} = require('./consts');


/**
 * Retrieves block from block history by provided block hash.
 * @name getBlockByHash
 * @param {string} blockHash hash of the block.
 * @return {object} Block history object with properties.
 */
async function getBlockByHash(blockHash) {
  const block = await knex.select(
    'id', 'block_hash', 'block_height', 'created_at'
    )
    .from(BLOCK_HISTORY_TABLE_NAME)
    .where('block_hash', blockHash);

  return block[0];
}

/**
 * Creates new block history.
 * @name createBlockHistory
 * @param {string} blockHash hash of the block.
 * @param {Number} blockHeight height of the block.
 * @return {object} Block history object with properties.
 */
async function createBlockHistory(blockHash, blockHeight) {
  try {
    const createdBlockHistory = await knex(BLOCK_HISTORY_TABLE_NAME)
      .insert({
        block_hash: blockHash,
        block_height: blockHeight
      })
      .returning(['id', 'block_hash', 'block_height']);

    return createdBlockHistory[0];
  } catch (err) {
    throw new HttpError(
      status.INTERNAL_SERVER_ERROR,
      'Something went wrong with inserting new block to history.'
    );
  }
}

/**
 * Retrieves address by provided address base58 string.
 * @name getAddress
 * @param {string} address base58 string of the address.
 * @return {object} Address object with properties.
 */
async function getAddress(address) {
  try {
    const userAddress = await knex({
      address: ADDRESS_TABLE_NAME,
      user: USER_TABLE_NAME
    })
      .select({
        id: `${ADDRESS_TABLE_NAME}.id`,
        public_key: `${ADDRESS_TABLE_NAME}.public_key`,
        unconfirmed_balance: `${ADDRESS_TABLE_NAME}.unconfirmed_balance`,
        confirmed_balance: `${ADDRESS_TABLE_NAME}.confirmed_balance`,
        user_id: `${USER_TABLE_NAME}.id`
      })
      .where(`${ADDRESS_TABLE_NAME}.public_key`, address);

    return userAddress[0];
  } catch (err) {
    throw new HttpError(
      status.INTERNAL_SERVER_ERROR,
      'Something went wrong with retrieving address.'
    )
  }
}

/**
 * Creates unconfirmed inbound transaction and increases unconfirmed
 * balance on address that recieved the coins.
 * @name createUnconfirmedInboundTransaction
 * @param {string} transactionId hash of the transaction.
 * @param {string} blockHash hash of the block where transaction resides.
 * @param {Number} amountReceived amount of received coins.
 * @param {BigInteger} transactionTimestamp timestamp of the transaction.
 * @param {object} userAddress Address object that received the coins.
 */
async function createUnconfirmedInboundTransaction(
  transactionId, blockHash, amountReceived, transactionTimestamp, userAddress
) {
  return knex.transaction(async pgTransaction => {
    try {
      await pgTransaction(TRANSACTION_TABLE_NAME)
        .insert({
          type: TRANSACTION_TYPE.INBOUND,
          status: TRANSACTION_STATUS.UNCONFIRMED,
          transaction_id: transactionId,
          block_id: blockHash,
          amount_received: amountReceived,
          transaction_timestamp: transactionTimestamp,
          public_key: userAddress.public_key,
          user_id: userAddress.user_id
        });

      await pgTransaction(ADDRESS_TABLE_NAME)
        .where('id', userAddress.id)
        .increment({
          unconfirmed_balance: amountReceived
        });
    } catch (err) {
      await pgTransaction.rollback();
      throw new HttpError(
        status.INTERNAL_SERVER_ERROR,
        'Something went wrong with creating inbound unconfirmed transaction.'
      );
    }
  });
}

/**
 * Retrieves `Unconfirmed` and `Accepted` transactions.
 * @name getUnconfirmedAndAcceptedTransactions
 * @return {object} List of Transaction objects with properties.
 */
async function getUnconfirmedAndAcceptedTransactions() {
  return await knex.select(
    'id', 'type', 'status', 'transaction_id', 'block_id',
    'amount_received', 'transaction_timestamp', 'public_key',
    'user_id', 'created_at'
  )
  .from(TRANSACTION_TABLE_NAME)
  .where('status', TRANSACTION_STATUS.UNCONFIRMED)
  .orWhere('status', TRANSACTION_STATUS.ACCEPTED);
}

/**
 * Updates transaction to `Confirmed`.
 * @name updateTransactionStatus
 * @param {string} transactionId hash of the transaction.
 * @param {string} publicKey address of the receiving party.
 */
async function updateTransactionStatus(transactionId, publicKey) {
  return await knex(TRANSACTION_TABLE_NAME)
    .update({
      status: TRANSACTION_STATUS.CONFIRMED
    })
    .where({
      transaction_id: transactionId,
      public_key: publicKey
    });
}

/**
 * Updates transaction to `Confirmed` and updates balances accordingly.
 * @name updateBalancesAndTransactionStatusToConfirmed
 * @param {string} transactionId hash of the transaction.
 * @param {string} publicKey address of the receiving party.
 */
async function updateBalancesAndTransactionStatusToConfirmed(transactionId, publicKey) {
  return knex.transaction(async pgTransaction => {
    try {
      await pgTransaction(TRANSACTION_TABLE_NAME)
        .update({
          status: TRANSACTION_STATUS.CONFIRMED,
        })
        .where({
          transaction_id: transactionId,
          public_key: publicKey
        });

      await pgTransaction(ADDRESS_TABLE_NAME)
        .where('public_key', publicKey)
        .decrement({
          unconfirmed_balance: amountReceived
        })
        .increment({
          confirmed_balance: amountReceived
        });
    } catch (err) {
      await pgTransaction.rollback();
      throw new HttpError(
        status.INTERNAL_SERVER_ERROR,
        'Something went wrong with updating transaction.'
      );
    }
  });
}

module.exports = {
  getBlockByHash: getBlockByHash,
  createBlockHistory: createBlockHistory,
  getAddress: getAddress,
  createUnconfirmedInboundTransaction: createUnconfirmedInboundTransaction,
  getUnconfirmedAndAcceptedTransactions: getUnconfirmedAndAcceptedTransactions,
  updateTransactionStatus: updateTransactionStatus,
  updateBalancesAndTransactionStatusToConfirmed: updateBalancesAndTransactionStatusToConfirmed
};
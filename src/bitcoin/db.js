const { knex } = require('../db/config');
const { HttpError } = require('../errors');
const status = require('http-status');
const { USER_TABLE_NAME } = require('../users/tables');
const {
  BLOCK_HISTORY_TABLE_NAME,
  ADDRESS_TABLE_NAME,
  TRANSACTION_TABLE_NAME,
  BALANCE_TABLE_NAME
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
 * Paginates blockHistory table.
 * @name paginateBlockHistory
 * @param {Number} currentPage - Current page set for pagination.
 * @return {object} Database entries count and block history objects.
 * @err {object} HttpError
 */
async function paginateBlockHistory(currentPage) {
  // Paginate over blockHistory table.
  const blockHistoryResult = await knex(BLOCK_HISTORY_TABLE_NAME)
  .select(
    'id', 'block_height', 'block_hash', 'created_at'
  )
  .orderBy('created_at', 'desc')
  .paginate({
    perPage: 20,
    currentPage: currentPage
  });
  // Return count and entires for retrieved blocks.
  return {
    count: blockHistoryResult.pagination.total || 0,
    currentPage: blockHistoryResult.pagination.currentPage || null,
    lastPage: blockHistoryResult.pagination.lastPage || null,
    results: blockHistoryResult.data
  };
}

/**
 * Creates new address entry.
 * @name createAddress
 * @param {string} address newly created bitcoin address.
 * @param {Number} userId users internal identifier.
 * @return {object} Address object with properties.
 */
async function createAddress(address, userId) {
  try {
    const createdAddress = await knex(ADDRESS_TABLE_NAME)
      .insert({
        public_key: address,
        user_id: userId
      })
      .returning([
        'id', 'public_key', 'created_at'
      ]);

    return createdAddress[0];
  } catch (err) {
    throw new HttpError(
      status.INTERNAL_SERVER_ERROR,
      'Something went wrong with inserting new address.'
    );
  }
}

/**
 * Retrieves address by provided address base58 string.
 * @name getAddressByPublicKey
 * @param {string} address base58 string of the address.
 * @return {object} Address object with properties.
 */
async function getAddressByPublicKey(address) {
  try {
    const userAddress = await knex(ADDRESS_TABLE_NAME)
      .select('id', 'public_key', 'user_id', 'created_at')
      .where('public_key', address);

    return userAddress[0];
  } catch (err) {
    throw new HttpError(
      status.INTERNAL_SERVER_ERROR,
      'Something went wrong with retrieving address.'
    )
  }
}

/**
 * Paginates all address table.
 * @name paginateAllAddresses
 * @param {Number} currentPage - Current page set for pagination.
 * @return {object} Database entries count and address objects.
 * @err {object} HttpError
 */
async function paginateAllAddresses(currentPage) {
  // Paginate over address table.
  const addressesResult = await knex({
    address: ADDRESS_TABLE_NAME,
    user: USER_TABLE_NAME
  })
  .select({
    id: `${ADDRESS_TABLE_NAME}.id`,
    public_key: `${ADDRESS_TABLE_NAME}.public_key`,
    user_id: `${USER_TABLE_NAME}.id`,
    user_first_name: `${USER_TABLE_NAME}.first_name`,
    user_last_name: `${USER_TABLE_NAME}.last_name`,
    user_email: `${USER_TABLE_NAME}.email`,
    created_at: `${ADDRESS_TABLE_NAME}.created_at`
  })
  .orderBy('created_at', 'desc')
  .paginate({
    perPage: 20,
    currentPage: currentPage
  });
  // Return count and entires for retrieved addresses.
  return {
    count: addressesResult.pagination.total || 0,
    currentPage: addressesResult.pagination.currentPage || null,
    lastPage: addressesResult.pagination.lastPage || null,
    results: addressesResult.data
  };
}

/**
 * Paginates address table by specific user id.
 * @name paginateAddressesByUserId
 * @param {Number} userId - id of the user.
 * @param {Number} currentPage - Current page set for pagination.
 * @return {object} Database entries count and address objects.
 * @err {object} HttpError
 */
async function paginateAddressesByUserId(userId, currentPage) {
  // Paginate over address table by `user_id`.
  const addressesResult = await knex(ADDRESS_TABLE_NAME)
  .select(
    'id', 'public_key', 'created_at'
  )
  .where('user_id', userId)
  .orderBy('created_at', 'desc')
  .paginate({
    perPage: 20,
    currentPage: currentPage
  });
  // Return count and entires for retrieved addresses.
  return {
    count: addressesResult.pagination.total || 0,
    currentPage: addressesResult.pagination.currentPage || null,
    lastPage: addressesResult.pagination.lastPage || null,
    results: addressesResult.data
  };
}

/**
 * Retrieves balance by specific user id.
 * @name getBalanceByUserId
 * @param {Number} userId - id of the user.
 * @return {object} Balance object with properties.
 * @err {object} HttpError
 */
async function getBalanceByUserId(userId) {
  const userBalance = await knex(BALANCE_TABLE_NAME)
  .select(
    'id', 'unconfirmed_balance', 'confirmed_balance',
    'created_at'
  )
  .where('user_id', userId);

  return userBalance[0]
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

      await pgTransaction(BALANCE_TABLE_NAME)
        .where('user_id', userAddress.user_id)
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
 * Creates unconfirmed outbound transaction and decreases confirmed
 * balance on address that sends the coins.
 * @name createUnconfirmedOutboundTransaction
 * @param {string} transactionId hash of the transaction.
 * @param {string} blockHash hash of the block where transaction resides.
 * @param {Number} receivingAmount amount of sent coins.
 * @param {BigInteger} transactionTimestamp timestamp of the transaction.
 * @param {string} recevingAddress - address that will receive coins.
 * @param {Number} userId - user identifier.
 */
async function createUnconfirmedOutboundTransaction(
  transactionId, receivingAmount, transactionTimestamp, recevingAddress,
  userId
) {
  return knex.transaction(async pgTransaction => {
    try {
      await pgTransaction(TRANSACTION_TABLE_NAME)
        .insert({
          type: TRANSACTION_TYPE.INBOUND,
          status: TRANSACTION_STATUS.UNCONFIRMED,
          transaction_id: transactionId,
          amount_received: receivingAmount,
          transaction_timestamp: transactionTimestamp,
          public_key: recevingAddress,
          user_id: userId
        });

      await pgTransaction(BALANCE_TABLE_NAME)
        .where('user_id', userId)
        .decrement({
          confirmed_balance: receivingAmount
        });
    } catch (err) {
      await pgTransaction.rollback();
      throw new HttpError(
        status.INTERNAL_SERVER_ERROR,
        'Something went wrong with creating outbound unconfirmed transaction.'
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
 * @param {string} transactionId - hash of the transaction.
 * @param {string} publicKey - address of the receiving party.
 * @param {Number} amountReceived - amount of coins received.
 * @param {Number} userId - user identifier.
 */
async function updateBalancesAndTransactionStatusToConfirmed(
  transactionId, publicKey, amountReceived, userId
) {
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

      await pgTransaction(BALANCE_TABLE_NAME)
        .where('user_id', userId)
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
        'Something went wrong with updating transaction status to confirmed.'
      );
    }
  });
}

/**
 * Paginates all transactions table.
 * @name paginateAllTransactions
 * @param {Number} currentPage - Current page set for pagination.
 * @return {object} Database entries count and transaction objects.
 * @err {object} HttpError
 */
async function paginateAllTransactions(currentPage) {
  // Paginate over transaction table.
  const transactionsResult = await knex({
    transaction: TRANSACTION_TABLE_NAME,
    user: USER_TABLE_NAME
  })
  .select({
    id: `${TRANSACTION_TABLE_NAME}.id`,
    type: `${TRANSACTION_TABLE_NAME}.type`,
    status: `${TRANSACTION_TABLE_NAME}.status`,
    transaction_id: `${TRANSACTION_TABLE_NAME}.transaction_id`,
    block_id: `${TRANSACTION_TABLE_NAME}.block_id`,
    amount_received: `${TRANSACTION_TABLE_NAME}.amount_received`,
    transaction_timestamp: `${TRANSACTION_TABLE_NAME}.transaction_timestamp`,
    public_key: `${TRANSACTION_TABLE_NAME}.public_key`,
    user_id: `${USER_TABLE_NAME}.id`,
    user_first_name: `${USER_TABLE_NAME}.first_name`,
    user_last_name: `${USER_TABLE_NAME}.last_name`,
    user_email: `${USER_TABLE_NAME}.email`,
    created_at: `${TRANSACTION_TABLE_NAME}.created_at`
  })
  .orderBy('created_at', 'desc')
  .paginate({
    perPage: 20,
    currentPage: currentPage
  });
  // Return count and entires for retrieved transactions.
  return {
    count: transactionsResult.pagination.total || 0,
    currentPage: transactionsResult.pagination.currentPage || null,
    lastPage: transactionsResult.pagination.lastPage || null,
    results: transactionsResult.data
  };
}

/**
 * Paginates transaction table by specific user id.
 * @name paginateTransactionsByUserId
 * @param {Number} userId - id of the user.
 * @param {Number} currentPage - Current page set for pagination.
 * @return {object} Database entries count and transaction objects.
 * @err {object} HttpError
 */
async function paginateTransactionsByUserId(userId, currentPage) {
  // Paginate over transaction table.
  const transactionsResult = await knex(TRANSACTION_TABLE_NAME)
  .select(
    'id', 'type', 'status', 'transaction_id', 'block_id',
    'amount_received', 'transaction_timestamp', 'public_key',
    'created_at'
  )
  .where('user_id', userId)
  .orderBy('created_at', 'desc')
  .paginate({
    perPage: 20,
    currentPage: currentPage
  });
  // Return count and entires for retrieved transactions.
  return {
    count: transactionsResult.pagination.total || 0,
    currentPage: transactionsResult.pagination.currentPage || null,
    lastPage: transactionsResult.pagination.lastPage || null,
    results: transactionsResult.data
  };
}

module.exports = {
  getBlockByHash: getBlockByHash,
  createBlockHistory: createBlockHistory,
  paginateBlockHistory: paginateBlockHistory,
  createAddress: createAddress,
  getAddressByPublicKey: getAddressByPublicKey,
  paginateAllAddresses: paginateAllAddresses,
  paginateAddressesByUserId: paginateAddressesByUserId,
  getBalanceByUserId: getBalanceByUserId,
  createUnconfirmedInboundTransaction: createUnconfirmedInboundTransaction,
  createUnconfirmedOutboundTransaction: createUnconfirmedOutboundTransaction,
  getUnconfirmedAndAcceptedTransactions: getUnconfirmedAndAcceptedTransactions,
  updateTransactionStatus: updateTransactionStatus,
  updateBalancesAndTransactionStatusToConfirmed: updateBalancesAndTransactionStatusToConfirmed,
  paginateAllTransactions: paginateAllTransactions,
  paginateTransactionsByUserId: paginateTransactionsByUserId
};
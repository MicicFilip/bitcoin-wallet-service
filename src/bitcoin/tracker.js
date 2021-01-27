const { HttpError } = require('../errors');
const status = require('http-status');
const pg = require('./db');
const rpc = require('./rpc');
const { logger } = require('../utils');
const {
  TRANSACTION_TYPE,
  TRANSACTION_STATUS,
  NUMBER_OF_CONFIRMATIONS
} = require('./consts');

/**
 * Tracks provided block hash in the database, if it doesn't exist
 * it handles inbound transactions and inserts new block into the history.
 * @param {string} blockHash - Block hash of the current block
 * @return {object} null
 * @err {object} HttpError
 */
async function trackBlocks(blockHash) {
  const block = await pg.getBlockByHash(blockHash);
  // If block already exists in the system we will skip tracking blocks,
  // since we are on top of the chain.
  if (block) {
    return null;
  }

  // `blockStack` hold a list of block hashes that aren't tracked
  // by the system.
  const blockStack = await _handleBlockCatchUp(blockHash);

  while (blockStack.length !== 0) {
    // Pop block hash from the stack.
    const blockHash = blockStack.pop();
    // Retrieve block height from the network.
    const blockHeight = await rpc.getBlockHeightByBlockHash(blockHash);
    // Process inbound transactions if there are any.
    await _processInboundTransactions(blockHash);
    // Add newly processed block to the block history.
    await pg.createBlockHistory(blockHash, blockHeight);

    logger.log({
      level: 'info',
      message: `${blockHeight} block processed!`
    });
  }
}

/**
 * Checks if the system is out of sync with the chain.
 * @param {String} blockHash - Hash of the current block.
 * @return {Array} Stack of block hashes that aren't in sync with our system.
 * @err {object} HttpError
 */
async function _handleBlockCatchUp(blockHash) {
  try {
    // List of block hashs that aren't sync with the system will be stored here.
    const blockStack = [];
    // Push current block hash to the stack since it isn't in the system.
    blockStack.push(blockHash);

    // Retrieve previous block hash from the blockchain.
    let previousBlockHash = await rpc.getPreviousBlockHashByHash(blockHash);
    // Retrieve block from the database using previous block hash.
    let previousBlock = await pg.getBlockByHash(previousBlockHash);

    // While there are previous blocks that aren't in the system, we
    // will add them to `blockStack`.
    while (!previousBlock && previousBlockHash) {
      // Add previous block hash to the stack since we didn't track it.
      blockStack.push(previousBlockHash);
      previousBlockHash = await rpc.getPreviousBlockHashByHash(previousBlockHash);
      previousBlock = await pg.getBlockByHash(previousBlockHash);
    }

    return blockStack;
  } catch (err) {
    if (err instanceof HttpError) {
      throw err;
    }

    throw new HttpError(status.INTERNAL_SERVER_ERROR, `Syncing blocks failed.`);
  }
}

/**
 * Processes inbound transactions that were located in the provided block.
 * @param {string} blockHash - Hash of the block.
 * @return {object} Block information
 * @err {object} HttpError
 */
async function _processInboundTransactions(blockHash) {
  try {
    // Retrieves all transactions from block by provided block hash.
    const blockTransactions = await rpc.getBlockTransactionsByBlockHash(blockHash);
    for (const transactionId of blockTransactions) {
      // Retrieves raw information about provided transaction id.
      const rawTransaction = await rpc.getRawTransaction(transactionId, blockHash);

      // Iterate over transaction outputs to actually see where did the coins go.
      for (const vectorOutput of rawTransaction.vout) {
        const transactionOutputAddresses = vectorOutput.scriptPubKey.addresses;
        // Check if the transaction contains output addresses, if there are multiple
        // addresses in a single output we detected a transaction with multiple receviers.
        if (transactionOutputAddresses) {
          if (transactionOutputAddresses.length > 1) {
            logger.log({
              level: 'warn',
              message: `Transaction ${transactionId} with multiple outputs for single address detected!`
            });
          } else {
            // Retrieve receving bitcoin address from transaction output.
            const bitcoinAddress = transactionOutputAddresses[0];
            // Check if receving bitcoin address exists in the system.
            const userAddress = await pg.getAddress(bitcoinAddress);
            if (userAddress) {
              const amountReceived = vectorOutput.value;
              const transactionTimestamp = rawTransaction.time;
              // If user address is found system will create an inbound unconfirmed
              // transaction and increase the unconfirmed balance of the address.
              await pg.createUnconfirmedInboundTransaction(
                transactionId, blockHash, amountReceived, transactionTimestamp, userAddress
              );
              logger.log({
                level: 'info',
                message: `${userAddress.user_id} received ${amountReceived} amount via ${transactionId} transaction.`
              });
            }
          }
        }
      }
    }
  } catch (err) {
    throw new HttpError(
      status.INTERNAL_SERVER_ERROR,
      `Processing inbound transactions failed ${err.message}`
    );
  }
}

/**
 * Tracks inbound transaction confirmations.
 * @err {object} HttpError
 */
async function trackTransactionConfirmations() {
  // Retrieve all `Unconfirmed` and `Accepted` transactions.
  const transactionsStack = await pg.getUnconfirmedAndAcceptedTransactions();
  if (transactionsStack.length === 0) {
    logger.log({
      level: 'info',
      message: 'No `Unconfirmed` or `Accepted` transactions to be tracked.'
    });
    return null;
  }

  for (const transaction of transactionsStack) {
    const transactionId = transaction.transaction_id;
    const blockHash = transaction.block_id;
    // Retrieve raw transacation data from the network.
    const rawTransaction = rpc.getRawTransaction(transactionId, blockHash);

    if (rawTransaction.confirmations >= NUMBER_OF_CONFIRMATIONS) {
      // If transacation that system detected is `Inbound` we need to update transaction status and
      // increase confirmed balance of that address.
      if (transaction.type === TRANSACTION_TYPE.INBOUND) {
        await pg.updateBalancesAndTransactionStatusToConfirmed(
          transactionId, transaction.public_key
        );
      // If transaction that system detected is `Outbound` we just need to update transaction status
      // to `Confirmed`.
      } else if (transaction.type === TRANSACTION_TYPE.OUTBOUND) {
        await pg.updateTransactionStatus(
          transactionId, transaction.public_key, TRANSACTION_STATUS.CONFIRMED
        );
      }

      logger.log({
        level: 'info',
        message: `${transaction.type} ${transactionId} transaction has been confirmed!`
      });
    }
  }
}

module.exports = {
  trackBlocks: trackBlocks,
  trackTransactionConfirmations: trackTransactionConfirmations
};
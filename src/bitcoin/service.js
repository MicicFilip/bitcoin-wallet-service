const { HttpError } = require('../errors');
const status = require('http-status');
const pg = require('./db');
const rpc = require('./rpc');

/**
 * Tracks provided block hash in the database, if it doesn't exist
 * it handles inbound transactions and inserts new block into the history.
 * @param {string} blockHash - Block hash of the current block
 * @return {object} null
 * @err {object} HttpError
 */
async function trackBlocks(blockHash)  {
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
    // TODO: Process inbound transactions if there are any.
    await _processInboundTransactions(blockHash);
    await pg.createBlockHistory(blockHash, blockHeight);
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
            // TODO: log multiple addresses as a reciever of same funds which is invalid.
            console.log('ou shit');
          } else {
            // Retrieve receving bitcoin address from transaction output.
            const bitcoinAddress = transactionOutputAddresses[0];
            // Check if receving bitcoin address exists in the system.
            const userAddress = await pg.getAddress(bitcoinAddress);
            if (userAddress) {
              const amountReceived = vectorOutput.value;
              const transactionTimestamp = rawTransaction.time;
              // TODO: Test this with actual coins.
              // If user address is found system will create an inbound unconfirmed
              // transaction and increase the unconfirmed balance of the address.
              await pg.createUnconfirmedInboundTransaction(
                transactionId, amountReceived, transactionTimestamp, userAddress
              );
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

module.exports = {
  trackBlocks: trackBlocks
};
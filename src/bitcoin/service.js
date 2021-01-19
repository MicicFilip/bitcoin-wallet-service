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
    while (previousBlock && previousBlockHash) {
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

module.exports = {
  trackBlocks: trackBlocks
};
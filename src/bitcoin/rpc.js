const Client = require('bitcoin-core');
const { HttpError } = require('../errors');
const status = require('http-status');

const client = new Client({
  host: process.env.RPC_HOST || 'localhost',
  port: process.env.RPC_PORT || '18332',
  username: process.env.RPC_USER || 'admin',
  password: process.env.RPC_PASS || 'admin'
});


/**
 * Get previous block hash by current block hash.
 * @param {string} blockHash - Hash of the current block.
 * @return {string} Previous block hash
 * @err {object} HttpError
 */
async function getPreviousBlockHashByHash(blockHash) {
  try {
    const block = await client.command('getblock', blockHash);
    return block.previousblockhash;
  } catch (err) {
    throw new HttpError(
      status.INTERNAL_SERVER_ERROR,
      `Bitcoin RPC connection failed: ${err.message}`
    );
  }
}

/**
 * Gets block height from block hash
 * @param {string} blockHash - Hash of the block.
 * @return {integer} Block height
 * @err {object} HttpError
 */
async function getBlockHeightByBlockHash(blockHash) {
  try {
    const block = await client.command('getblock', blockHash);
    return block.height;
  } catch (err) {
    throw new HttpError(
      status.INTERNAL_SERVER_ERROR,
      `Bitcoin RPC connection failed: ${err.message}`
    );
  }
}

/**
 * Gets transactions from bitcoin block by block hash.
 * @param {string} blockHash - Hash of the block.
 * @return {Array} Array of transactions hash ids that were in that block
 * @err {object} HttpError
 */
async function getBlockTransactionsByBlockHash(blockHash) {
  try {
    const block = await client.command('getblock', blockHash);
    return block.tx;
  } catch (err) {
    throw new HttpError(
      status.INTERNAL_SERVER_ERROR,
      `Bitcoin RPC connection failed: ${err.message}`
    );
  }
}

/**
 * Gets raw transaction data by transaction id.
 * @param {string} transactionId - hash id of the transaction.
 * @param {string} blockHash - hash of the block.
 * @return {Array} Transaction information
 * @err {object} HttpError
 */
async function getRawTransaction(transactionId, blockHash) {
  try {
    return await client.command('getrawtransaction', transactionId, 1, blockHash);
  } catch (err) {
    throw new HttpError(
      status.INTERNAL_SERVER_ERROR,
      `Bitcoin RPC connection failed: ${err.message}`
    );
  }
}

module.exports = {
  getPreviousBlockHashByHash: getPreviousBlockHashByHash,
  getBlockHeightByBlockHash: getBlockHeightByBlockHash,
  getBlockTransactionsByBlockHash: getBlockTransactionsByBlockHash,
  getRawTransaction: getRawTransaction
};
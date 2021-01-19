const { knex } = require('../db/config');
const { HttpError } = require('../errors');
const status = require('http-status');
const { BLOCK_HISTORY_TABLE_NAME } = require('./tables');


async function getBlockByHash(blockHash) {
  const block = await knex.select(
    'id', 'block_hash', 'block_height', 'created_at'
  )
  .from(BLOCK_HISTORY_TABLE_NAME)
  .where('block_hash', blockHash);

  return block[0];
}

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
      'Something went wrong with inserting new block.'
    );
  }
}

module.exports = {
  getBlockByHash: getBlockByHash,
  createBlockHistory: createBlockHistory
}
const { BLOCK_HISTORY_TABLE_NAME } = require('../../bitcoin/tables');

/**
 * Seed block history data.
 * @param {object} knex - Knex object.
 * @return {boolean} true
 */
async function seed(knex) {
  try {
    await knex(BLOCK_HISTORY_TABLE_NAME).del();
    await knex(BLOCK_HISTORY_TABLE_NAME).insert({
      'block_height': 1934576,
      'block_hash': '000000000000000323f1ba3025ef88959d13420da8ab05c2dfd754d61a331e05',
    });

    return true;
  } catch (err) {
    throw err;
  }
}

module.exports = {
  seed: seed
};

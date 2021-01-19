const { userTable, USER_TABLE_NAME } = require('../../users/tables');

// Migrate UP user tables.
exports.up = async function(knex) {
  try {
    await userTable(knex);

    return true;
  } catch (err) {
    throw err;
  }
};

// Migrate DOWN user tables.
exports.down = async function(knex) {
  try {
    await knex.schema.dropTable(USER_TABLE_NAME);

    return true;
  } catch (err) {
    throw err;
  }
};

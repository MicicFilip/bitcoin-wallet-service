const Joi = require('joi');

// Bitcoin block hash regex.
const blockHashRegex = new RegExp(/^[0]{8}[a-fA-F0-9]{56}$/);

const blocknotifySchema = Joi.object().keys({
  block_hash: Joi.string().regex(blockHashRegex).required()
});

module.exports = {
  blocknotifySchema: blocknotifySchema
}
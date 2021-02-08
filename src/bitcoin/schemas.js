const Joi = require('joi');

// Bitcoin block hash regex.
const blockHashRegex = new RegExp(/^[0]{8}[a-fA-F0-9]{56}$/);
// Bitcoin testnet address regex.
const addressRegex = new RegExp(/^[2mn][1-9A-HJ-NP-Za-km-z]{26,35}/);

const blocknotifySchema = Joi.object().keys({
  block_hash: Joi.string().regex(blockHashRegex).required()
});

const withdrawCoinsSchema = Joi.object().keys({
  amount: Joi.number().required(),
  address: Joi.string().regex(addressRegex).required()
});

module.exports = {
  blocknotifySchema: blocknotifySchema,
  withdrawCoinsSchema: withdrawCoinsSchema
}
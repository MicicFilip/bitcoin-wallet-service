const Joi = require('joi');

// Password Regex
const passwordRegex = new RegExp(/^[A-Za-z0-9_@./#&+-]{5,36}$/);

const userRegisterSchema = Joi.object().keys({
  first_name: Joi.string().max(35).required(),
  last_name: Joi.string().max(35).required(),
  email: Joi.string().email().max(100).required(),
  password: Joi.string().regex(passwordRegex).required(),
});

const userLoginSchema = Joi.object().keys({
  email: Joi.string().email().max(100).required(),
  password: Joi.string().regex(passwordRegex).required()
});

module.exports = {
  userRegisterSchema: userRegisterSchema,
  userLoginSchema: userLoginSchema
}
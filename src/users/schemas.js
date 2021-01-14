const Joi = require('joi');
const { DEFAULT_USER_ROLE, ADMIN_USER_ROLE } = require('./consts');

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

const userCreateSchema = Joi.object().keys({
  first_name: Joi.string().max(35).required(),
  last_name: Joi.string().max(35).required(),
  email: Joi.string().email().max(100).required(),
  password: Joi.string().regex(passwordRegex).required(),
  role: Joi.string().valid(DEFAULT_USER_ROLE, ADMIN_USER_ROLE).required()
});

const userUpdateSchema = Joi.object().keys({
  first_name: Joi.string().max(35),
  last_name: Joi.string().max(35),
  email: Joi.string().email().max(100),
  password: Joi.string().regex(passwordRegex),
  role: Joi.string().valid(DEFAULT_USER_ROLE, ADMIN_USER_ROLE)
});

module.exports = {
  userRegisterSchema: userRegisterSchema,
  userLoginSchema: userLoginSchema,
  userCreateSchema: userCreateSchema,
  userUpdateSchema: userUpdateSchema
}
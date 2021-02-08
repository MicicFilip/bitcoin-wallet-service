const express = require('express');
const status = require('http-status');
const jwt = require('../authorization');
const { ADMIN_USER_ROLE } = require('../users/consts');
const { blocknotifySchema, withdrawCoinsSchema } = require('./schemas');
const pg = require('./db');
const {
  trackBlocks,
  trackTransactionConfirmations
} = require('./tracker');
const { logger } = require('../utils');
const rpc = require('./rpc');

const router = express.Router();

/* POST route for notifying system of new bitcoin block hash. */
router.post('/blocknotify', async (request, reply) => {
  const requestHost = request.headers.host.split(":")[0];

  if (requestHost !== '127.0.0.1' && requestHost !== 'localhost') {
    return reply.status(status.FORBIDDEN).send({ message: "Access denied" });
  }

  // Validate bitcoin block hash hex format.
  try {
    await blocknotifySchema.validateAsync(request.body);
  } catch (err) {
    return reply.status(status.BAD_REQUEST).send({ message: 'Block hash not in valid format.' });
  }

  // Synchronize bitcoin blocks on the network with ones kept in the system.
  // After catching up to the bitcoin network, we need to track transaction confirmations
  // of both Inbound and Outbound transactions.
  try {
    await trackBlocks(request.body.block_hash);
    await trackTransactionConfirmations();
  } catch (err) {
    logger.log({
      level: 'error',
      message: `Error occurred while tracking blocks: ${err.message}`
    });

    return reply.status(status.INTERNAL_SERVER_ERROR)
      .send({ message: err.message });
  }

  return reply.status(200).send({ message: "Block recieved." });
});

/* GET route for listing all bitcoin blocks in the system, available for administrator users. */
router.get('/admin/block-history', async (request, reply) => {
  // Authorize user using JWT token, and check if that user has `admin` role.
  try {
    await jwt.authorize(request.headers['authorization'], ADMIN_USER_ROLE);
  } catch (err) {
    return reply.status(err.statusCode).send({ message: err.message });
  }

  // Get current pagination page.
  const currentPage = Number(request.query.page) || 1;
  // Paginate blockHistory table.
  const results = await pg.paginateBlockHistory(currentPage);
  return reply.status(status.OK).send(results);
});

/* GET route for listing all addresses in the system, available for administrator users. */
router.get('/admin/addresses', async (request, reply) => {
  // Authorize user using JWT token, and check if that user has `admin` role.
  try {
    await jwt.authorize(request.headers['authorization'], ADMIN_USER_ROLE);
  } catch (err) {
    return reply.status(err.statusCode).send({ message: err.message });
  }

  // Get current pagination page.
  const currentPage = Number(request.query.page) || 1;
  // Paginate address table.
  const results = await pg.paginateAllAddresses(currentPage);
  return reply.status(status.OK).send(results);
});

/* GET route for listing all transactions in the system, available for administrator users. */
router.get('/admin/transactions', async (request, reply) => {
  // Authorize user using JWT token, and check if that user has `admin` role.
  try {
    await jwt.authorize(request.headers['authorization'], ADMIN_USER_ROLE);
  } catch (err) {
    return reply.status(err.statusCode).send({ message: err.message });
  }

  // Get current pagination page.
  const currentPage = Number(request.query.page) || 1;
  // Paginate transaction table.
  const results = await pg.paginateAllTransactions(currentPage);
  return reply.status(status.OK).send(results);
});

/* GET route for showing avaliable balances that belong to the logged in user */
router.get('/balances', async (request, reply) => {
  // Verify integrity of JWT Token and authorized user.
  let tokenPayload;
  try {
    tokenPayload = await jwt.authorize(request.headers['authorization']);
  } catch (err) {
    return reply.status(err.statusCode).send({ message: err.message });
  }

  // Retrieves balance for provided user.
  const userBalance = await pg.getBalanceByUserId(tokenPayload.data.id);
  return reply.status(status.OK).send(userBalance);
});

/* GET route for listing addresses that belong to the logged in user. */
router.get('/addresses', async (request, reply) => {
  // Verify integrity of JWT Token and authorized user.
  let tokenPayload;
  try {
    tokenPayload = await jwt.authorize(request.headers['authorization']);
  } catch (err) {
    return reply.status(err.statusCode).send({ message: err.message });
  }

  // Get current pagination page.
  const currentPage = Number(request.query.page) || 1;
  // Paginate address table.
  const results = await pg.paginateAddressesByUserId(
    tokenPayload.data.id, currentPage
  );
  return reply.status(status.OK).send(results);
});

/* POST route for generating new bitcoin address. */
router.post('/addresses', async (request, reply) => {
  // Verify integrity of JWT Token and authorized user.
  let tokenPayload;
  try {
    tokenPayload = await jwt.authorize(request.headers['authorization']);
  } catch (err) {
    return reply.status(err.statusCode).send({ message: err.message });
  }

  // Generates new bitcoin address using RPC and binds it to the user
  // that initiated the request.
  let createdAddress;
  try {
    const newAddress = await rpc.getNewAddress();
    createdAddress = await pg.createAddress(newAddress, tokenPayload.data.id);
  } catch (err) {
    return reply.status(err.statuscode).send({ message: err.message });
  }

  return reply.status(status.OK).send(createdAddress);
});

/* GET route for listing transactions that belong to the logged in user. */
router.get('/transactions', async (request, reply) => {
  // Verify integrity of JWT Token and authorized user.
  let tokenPayload;
  try {
    tokenPayload = await jwt.authorize(request.headers['authorization']);
  } catch (err) {
    return reply.status(err.statusCode).send({ message: err.message });
  }

  // Get current pagination page.
  const currentPage = Number(request.query.page) || 1;
  // Paginate transactions table.
  const results = await pg.paginateTransactionsByUserId(
    tokenPayload.data.id, currentPage
  );
  return reply.status(status.OK).send(results);
});

/* POST route for withdrawing coins from the system. */
router.post('/transactions', async (request, reply) => {
  // Verify integrity of JWT Token and authorized user.
  let tokenPayload;
  try {
    tokenPayload = await jwt.authorize(request.headers['authorization']);
  } catch (err) {
    return reply.status(err.statusCode).send({ message: err.message });
  }

  const userId = tokenPayload.data.id;

  // Validate bitcoin block hash hex format.
  let requestData;
  try {
    requestData = await withdrawCoinsSchema.validateAsync(request.body);
  } catch (err) {
    return reply.status(status.BAD_REQUEST).send({ message: err.message });
  }

  const receivingAddress = requestData.address;
  const receivingAmount = requestData.amount;

  // Retrieve users sum of all addresses and check if they have enough coins
  // to make an outbound transaction.
  const userBalance = await pg.getBalanceByUserId(userId);
  if (Number(userBalance.confirmed_balance) < receivingAmount) {
    return reply.status(status.BAD_REQUEST).send({
      message: `You can't send ${receivingAmount} amount, your balance is ${userBalance.confirmed_balance}`
    });
  }

  // Resolve current timestamp.
  const currentTimestamp = Math.round(Date.now() / 1000);
  // Send coins to wanted address and with provided amount.
  // Create `Unconfirmed` `Outbound` Transaction and decrease confirmed users balance.
  let transactionId;
  try {
    transactionId = await rpc.sendCoinsToAddress(requestData.address, requestData.amount);
    await pg.createUnconfirmedOutboundTransaction(
      transactionId, receivingAmount, currentTimestamp, receivingAddress, userId
    );
  } catch (err) {
    return reply.status(err.statusCode).send({ message: err.message });
  }

  return reply.status(status.OK).send({ message: `Transaction with ${transactionId} id has been sent!` })
});

module.exports = router;
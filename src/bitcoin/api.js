const express = require('express');
const status = require('http-status');
const {blocknotifySchema} = require('./schemas');
const {
  trackBlocks,
  trackTransactionConfirmations
} = require('./tracker');
const { logger } = require('../utils');

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
      level: 'critical',
      message: `Error occurred while tracking blocks: ${err.message}`
    });

    return reply.status(status.INTERNAL_SERVER_ERROR)
      .send({ message: err.message });
  }

  return reply.status(200).send({ message: "Block recieved." });
});


// TODO: Continue writing financial routes.

module.exports = router;
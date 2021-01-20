const express = require('express');
const status = require('http-status');
const {blocknotifySchema} = require('./schemas');
const { trackBlocks } = require('./service');

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

  // TODO: track block
  await trackBlocks(request.body.block_hash);
  // TODO: handle inbound transaction confirmations
  // TODO: handle outbound transaction confirmations
  return reply.status(200).send({ message: "Block recieved." });
});


module.exports = router;
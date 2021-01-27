const TRANSACTION_TYPE = {
  INBOUND: 'Inbound',
  OUTBOUND: 'Outbound'
};

const TRANSACTION_STATUS = {
  // `Unconfirmed` transaction represents transaction that has
  // less than 6 confirmations.
  UNCONFIRMED: 'Unconfirmed',
  // `Confirmed` transaction represent transaction that has
  // more than 6 confirmations.
  CONFIRMED: 'Confirmed',
  // `Accepted` transaction represents that coins where sent over the network.
  ACCEPTED: 'Accepted'
};

// Number of confirmations represent how many blocks need to
// pass in order for the transaction to be confirmed.
const NUMBER_OF_CONFIRMATIONS = 6;

module.exports = {
  TRANSACTION_TYPE: TRANSACTION_TYPE,
  TRANSACTION_STATUS: TRANSACTION_STATUS,
  NUMBER_OF_CONFIRMATIONS: NUMBER_OF_CONFIRMATIONS,
};
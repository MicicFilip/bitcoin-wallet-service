// Load environment variables.
require('dotenv').config();

const Express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
// Require API routes.
const usersApi = require('./src/users/api');

// Setup Express application.
const app = Express();

// Parse incoming requests payloads.
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// Helmet secures Express applications by setting HTTP headers.
app.use(helmet());

// Register API routes.
app.use('/api/users', usersApi);

// Set application port and listen for incoming requests.
const PORT = process.env.PORT || 3000;
// Spin up the application.
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});
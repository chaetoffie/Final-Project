// db.js
require('dotenv').config();
const { Pool } = require('pg');

// The Pool automatically reads connection details (PGUSER, PGDATABASE, etc.) 
// from the .env file.
const pool = new Pool();

// Export the pool's query method for easy database interaction in server.js
module.exports = {
  query: (text, params) => pool.query(text, params),
};
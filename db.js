const { Pool } = require('pg');

// This is the FIX for ECONNREFUSED on Render
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // This setting prevents the pg client from rejecting Render's SSL certificate
    rejectUnauthorized: false 
  }
});

module.exports = db;
const { Pool } = require('pg');

// FIX: Explicitly configure SSL for Render
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // This is the critical line: It tells Node.js to trust Render's self-signed SSL cert.
    rejectUnauthorized: false 
  }
});

module.exports = db;
// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./db'); // Database connection import

const app = express();
const port = process.env.PORT || 3000;

// IMPORTANT: Load the secret token from environment variables
const DASHBOARD_TOKEN = process.env.DASHBOARD_TOKEN;

// Middleware setup
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true })); // Handle standard HTML form data
app.use(bodyParser.json());

// Serve all static files from the root directory
app.use(express.static(path.join(__dirname, '/')));


/**
 * 🛠️ Database Migration Function
 * This function checks for and adds the 'created_at' column if it's missing,
 * allowing the /messages route to work correctly and display timestamps.
 */
async function runMigrations() {
  try {
    // 1. Check if the 'created_at' column exists in the contact_messages table
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contact_messages' 
      AND column_name = 'created_at';
    `;
    const checkResult = await db.query(checkQuery);

    if (checkResult.rows.length === 0) {
      // 2. If the column is missing, run the ALTER TABLE command to add it
      console.log('⚠️ Running migration: Adding missing "created_at" column...');
      const alterQuery = `
        ALTER TABLE contact_messages
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      `;
      await db.query(alterQuery);
      console.log('✅ Migration successful: "created_at" column added.');
    } else {
      console.log('✅ Migration check: "created_at" column already exists. Skipping.');
    }
  } catch (err) {
    console.error('❌ Migration Error: Could not run schema updates:', err.message);
  }
}

/**
 * Diagnostic function to test the database connection on startup.
 */
async function initDatabase() {
  try {
    const result = await db.query('SELECT 1 + 1 AS solution');
    console.log('✅ Database Connection Test Successful:', result.rows[0].solution);
    return true;
  } catch (err) {
    console.error('❌ FATAL: Database Connection Failed on Startup. ECONNREFUSED likely caused by firewall.');
    console.error('>>> Ensure you are using the INTERNAL DATABASE URL for your Render environment variable (e.g., DATABASE_URL).');
    console.error('Error Details:', err.message);
    return false;
  }
}

/**
 * Helper function to generate a simple HTML page with the messages table.
 */
function generateMessagesTable(messages) {
  let tableRows = '';
  if (messages.length === 0) {
    tableRows = '<tr><td colspan="4" style="text-align: center; padding: 20px;">No messages have been submitted yet.</td></tr>';
  } else {
    tableRows = messages.map(msg => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px 15px; text-align: left;">${msg.name}</td>
        <td style="padding: 12px 15px; text-align: left;"><a href="mailto:${msg.email}" style="color: #007bff; text-decoration: none;">${msg.email}</a></td>
        <td style="padding: 12px 15px; text-align: left;">${msg.message}</td>
        <td style="padding: 12px 15px; text-align: left; font-size: 0.9em;">${msg.created_at ? new Date(msg.created_at).toLocaleString() : 'N/A'}</td>
      </tr>
    `).join('');
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Contact Messages Dashboard</title>
      <style>
        body { font-family: 'Arial', sans-serif; background-color: #f4f7f9; color: #333; margin: 0; padding: 20px; }
        .container { max-width: 1200px; margin: 40px auto; background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); padding: 30px; }
        h1 { color: #34495e; text-align: center; margin-bottom: 30px; border-bottom: 2px solid #34495e; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #34495e; color: white; padding: 15px; text-align: left; border-bottom: 3px solid #2c3e50; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        tr:hover { background-color: #f1f1f1; cursor: pointer; }
        .alert-box { padding: 15px; background-color: #f44336; color: white; margin-bottom: 15px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Submitted Contact Messages (${messages.length})</h1>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Message</th>
              <th>Submitted At</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <p style="text-align: center; margin-top: 30px;"><a href="/" style="color: #34495e; text-decoration: none; font-weight: bold;">← Back to Home Page</a></p>
      </div>
    </body>
    </html>
  `;
}

// 📬 POST Route to handle the Contact Form submission
app.post('/submit-contact', async (req, res) => {
  const { name, email, message } = req.body;

  try {
    const queryText = 'INSERT INTO contact_messages (name, email, message) VALUES ($1, $2, $3) RETURNING *';
    const values = [name, email, message];
    
    await db.query(queryText, values); 

    res.redirect('/thankyou.html'); 
  } catch (err) {
    console.error('Database Insertion Error (Runtime):', err.stack);
    res.status(500).send('Database connection error. Please try again later.'); 
  }
});

// 🔒 SECURED: GET Route to display all contact messages in an HTML table
app.get('/messages', async (req, res) => {
  const token = req.query.token;

  if (!DASHBOARD_TOKEN || token !== DASHBOARD_TOKEN) {
    console.warn('Unauthorized access attempt to /messages route.');
    return res.status(403).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Access Denied</title>
        <style>
          body { font-family: 'Arial', sans-serif; background-color: #f4f7f9; color: #333; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; height: 100vh; text-align: center;}
          .alert-box { padding: 30px; background-color: #e74c3c; color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); }
          h1 { margin-top: 0; }
        </style>
      </head>
      <body>
        <div class="alert-box">
          <h1>403 Forbidden</h1>
          <p>Access denied. A valid secret token is required to view this dashboard.</p>
        </div>
      </body>
      </html>
    `);
  }

  try {
    const result = await db.query('SELECT name, email, message, created_at FROM contact_messages ORDER BY created_at DESC'); 
    
    const html = generateMessagesTable(result.rows);
    res.send(html);
  } catch (err) {
    console.error('Database Retrieval Error:', err.stack);
    res.status(500).send('<h1>Error retrieving messages</h1><p>Check the server logs for details. (If you see this error, the migration may have failed.)</p>');
  }
});


// Start the application after attempting a database connection check AND migration
async function startServer() {
  const isDbReady = await initDatabase();
  
  if (isDbReady) {
    await runMigrations(); // <-- RUN MIGRATION HERE
  }

  app.listen(port, () => {
    const dbStatus = isDbReady ? 'Database Ready' : 'Database Error';
    console.log(`Server running on port ${port} | Status: ${dbStatus}`);
    
    if (!DASHBOARD_TOKEN) {
      console.warn('!!! WARNING: DASHBOARD_TOKEN environment variable is not set. The /messages route is inaccessible.');
    } else {
      // Use the correct secure token value here for easy copying
      console.log(`🔑 Secure dashboard access link: /messages?token=${DASHBOARD_TOKEN}`);
    }
  });
}

startServer();
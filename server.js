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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve all static files from the root directory
app.use(express.static(path.join(__dirname, '/')));

/**
 * 🛠️ Database Migration Function
 * This function checks for and adds missing columns/tables
 */
async function runMigrations() {
  try {
    // 1. Check and add 'created_at' column to contact_messages
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contact_messages' 
      AND column_name = 'created_at';
    `;
    const checkResult = await db.query(checkQuery);

    if (checkResult.rows.length === 0) {
      console.log('⚠️ Running migration: Adding missing "created_at" column...');
      const alterQuery = `
        ALTER TABLE contact_messages
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      `;
      await db.query(alterQuery);
      console.log('✅ Migration successful: "created_at" column added.');
    } else {
      console.log('✅ Migration check: "created_at" column already exists.');
    }

    // 2. Create orders table if it doesn't exist
    const createOrdersTable = `
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        address TEXT NOT NULL,
        items JSONB NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        reference_number VARCHAR(13) NOT NULL,
        payment_proof VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending_verification',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    await db.query(createOrdersTable);
    console.log('✅ Orders table ready');

  } catch (err) {
    console.error('❌ Migration Error:', err.message);
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
    console.error('❌ FATAL: Database Connection Failed on Startup.');
    console.error('>>> Ensure you are using the INTERNAL DATABASE URL.');
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
    console.error('Database Insertion Error:', err.stack);
    res.status(500).send('Database connection error. Please try again later.'); 
  }
});

// 🔒 SECURED: GET Route to display all contact messages
app.get('/messages', async (req, res) => {
  const token = req.query.token;

  if (!DASHBOARD_TOKEN || token !== DASHBOARD_TOKEN) {
    console.warn('Unauthorized access attempt to /messages route.');
    return res.status(403).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Access Denied</title>
        <style>
          body { font-family: 'Arial', sans-serif; background-color: #f4f7f9; color: #333; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; height: 100vh; text-align: center;}
          .alert-box { padding: 30px; background-color: #e74c3c; color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); }
        </style>
      </head>
      <body>
        <div class="alert-box">
          <h1>403 Forbidden</h1>
          <p>Access denied. A valid secret token is required.</p>
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
    res.status(500).send('<h1>Error retrieving messages</h1>');
  }
});

// ============================================
// 🛒 ORDERS API ROUTES
// ============================================

// GET all orders with optional filters
app.get('/api/orders', async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (id ILIKE $${params.length} OR customer_name ILIKE $${params.length} OR phone ILIKE $${params.length})`;
    }

    query += ' ORDER BY created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST new order
app.post('/api/orders', async (req, res) => {
  try {
    const { id, customerName, phone, address, items, total, referenceNumber, paymentProof } = req.body;
    
    const result = await db.query(
      `INSERT INTO orders (id, customer_name, phone, address, items, total, reference_number, payment_proof)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, customerName, phone, address, JSON.stringify(items), total, referenceNumber, paymentProof]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PATCH update order status
app.patch('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await db.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// DELETE order
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM orders WHERE id = $1', [id]);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// GET statistics
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'pending_verification') as pending,
        COUNT(*) FILTER (WHERE status = 'verified') as verified,
        COALESCE(SUM(total) FILTER (WHERE status = 'verified'), 0) as total_revenue
      FROM orders
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ============================================
// START SERVER
// ============================================

async function startServer() {
  const isDbReady = await initDatabase();
  
  if (isDbReady) {
    await runMigrations();
  }

  app.listen(port, () => {
    const dbStatus = isDbReady ? 'Database Ready' : 'Database Error';
    console.log(`Server running on port ${port} | Status: ${dbStatus}`);
    
    if (!DASHBOARD_TOKEN) {
      console.warn('!!! WARNING: DASHBOARD_TOKEN environment variable is not set.');
    } else {
      console.log(`🔒 Secure dashboard: /messages?token=${DASHBOARD_TOKEN}`);
    }
  });
}

startServer();
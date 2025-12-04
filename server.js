// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db'); // Import the database connection

const app = express();
const port = 3000;

// Middleware setup
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true })); // Handle standard HTML form data
app.use(bodyParser.json());

// Set up a simple route for the home page (optional, but good practice)
app.get('/', (req, res) => {
  res.send('Node.js server running for Louvre & Latte.');
});


// 📬 POST Route to handle the Contact Form submission
app.post('/submit-contact', async (req, res) => {
  // Get data from the HTML form (name, email, message)
  const { name, email, message } = req.body;

  try {
    // Parameterized query: $1, $2, $3 prevent SQL Injection
    const queryText = 'INSERT INTO contact_messages (name, email, message) VALUES ($1, $2, $3) RETURNING *';
    const values = [name, email, message];
    
    // Execute the query using the db connection pool
    await db.query(queryText, values); 

    // Redirect the user back to the contact section with a success query parameter
    res.redirect('/?status=success#contact'); 
  } catch (err) {
    console.error('Database Insertion Error:', err.stack);
    res.status(500).send("Form submission failed due to a server error.");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
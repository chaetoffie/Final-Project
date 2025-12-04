// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path'); // NEW: Required to handle file paths
const db = require('./db'); // Database connection import

const app = express();
const port = process.env.PORT || 3000; // UPDATED: Use the port provided by the host (e.g., Render)

// Middleware setup
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true })); // Handle standard HTML form data
app.use(bodyParser.json());

// 💡 NEW: Serve all your static files (index.html, CSS, images) from the root directory
app.use(express.static(path.join(__dirname, '/'))); 


// 📬 POST Route to handle the Contact Form submission (This section remains mostly the same)
app.post('/submit-contact', async (req, res) => {
  // Get data from the HTML form (name, email, message)
  const { name, email, message } = req.body;

  try {
    // Parameterized query for security
    const queryText = 'INSERT INTO contact_messages (name, email, message) VALUES ($1, $2, $3) RETURNING *';
    const values = [name, email, message];
    
    await db.query(queryText, values); 

    // Redirect the user back to the home page with a success message
    res.redirect('/thankyou.html'); 
  } catch (err) {
    console.error('Database Insertion Error:', err.stack);
    // Send a plain status response for a deployment environment
    res.status(500).send("Form submission failed due to a server error.");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
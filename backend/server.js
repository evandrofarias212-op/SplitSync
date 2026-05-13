// =============================================
// FILE: server.js
// This is the main file of the backend.
// It starts the server and connects all routes.
// =============================================

// Load environment variables from .env
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');

// Create the Express application
const app = express();

// Allow the frontend to communicate with the backend
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Allow the server to understand JSON data in requests
app.use(express.json());

// ── Serve the frontend files statically ──
// This makes the backend also serve the HTML, CSS and JS files
// So when you open http://localhost:3000 it shows the frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Define the port (from .env or default to 3000)
const PORT = process.env.PORT || 3000;

// ── API Routes ──
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/groups',   require('./routes/groups'));
app.use('/api/members',  require('./routes/members'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/whatsapp', require('./routes/whatsapp'));

// ── Root route → redirect to login page ──
// When someone opens http://localhost:3000 they go straight to login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── Catch all other routes → send to frontend ──
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Capture unhandled errors and show in terminal
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

// Start the server and listen on the defined port
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
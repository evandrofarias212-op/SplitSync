// =============================================
// FILE: routes/auth.js
// Defines the URL endpoints for authentication.
// =============================================

const express = require('express');

// Create a router (mini app just for auth routes)
const router = express.Router();

// Import the auth controller functions
const { login, logout, register } = require('../controllers/authController');

// Import the middleware to protect the logout route
const authMiddleware = require('../middlewares/authMiddleware');

// POST /api/auth/register → creates a new account
router.post('/register', register);

// POST /api/auth/login → calls the login function
router.post('/login', login);

// POST /api/auth/logout → protected, must be logged in
router.post('/logout', authMiddleware, logout);

// Export the router so server.js can use it
module.exports = router;
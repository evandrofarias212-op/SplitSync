// =============================================
// FILE: middlewares/authMiddleware.js
// This middleware protects private routes.
// It checks if the request has a valid token.
// If not, it blocks access and returns an error.
// =============================================

// Import the Supabase connection
const supabase = require('../config/supabaseClient');

// This function runs before every protected route
const authMiddleware = async (req, res, next) => {

  // Get the token from the request header
  // The frontend sends it like: Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];

  // If no token was sent, block access
  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  // The header looks like "Bearer eyJ...", we only want the token part
  const token = authHeader.split(' ')[1];

  // If the token is missing after "Bearer", block access
  if (!token) {
    return res.status(401).json({ error: 'Access denied. Invalid token format.' });
  }

  // Ask Supabase to verify if the token is valid
  const { data, error } = await supabase.auth.getUser(token);

  // If Supabase says the token is invalid, block access
  if (error || !data.user) {
    return res.status(401).json({ error: 'Access denied. Invalid or expired token.' });
  }

  // Token is valid! Save the user info in the request
  // so the next function can use it
  req.user = data.user;

  // Allow the request to continue to the actual route
  next();
};

// Export so other files can use this middleware
module.exports = authMiddleware;
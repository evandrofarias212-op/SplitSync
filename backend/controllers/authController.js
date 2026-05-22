// =============================================
// FILE: controllers/authController.js
// Contains the logic for admin login and logout.
// =============================================

// Import the Supabase connection
const supabase = require('../config/supabaseClient');

// ── LOGIN ──────────────────────────────────
// Called when the admin submits the login form.
// Checks email and password against Supabase Auth.
const login = async (req, res) => {

  // Get email and password from the request body
  const { email, password } = req.body;

  // Check if both fields were provided
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Try to sign in using Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  
  // If login failed, log the error and return
  if (error) {
     return res.status(401).json({ error: 'Invalid email or password.' });
    }
  // Login successful! Return the token and user info
  return res.status(200).json({
    message: 'Login successful!',
    // The token is used to authenticate future requests
    token: data.session.access_token,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  });
};

// ── LOGOUT ─────────────────────────────────
// Called when the admin clicks logout.
// Invalidates the current session in Supabase.
const logout = async (req, res) => {

  // Sign out from Supabase
  const { error } = await supabase.auth.signOut();

  if (error) {
    return res.status(500).json({ error: 'Error during logout.' });
  }

  return res.status(200).json({ message: 'Logged out successfully!' });
};

const register = async (req, res) => {

  const { name, email, password } = req.body;

  // Check if all fields were provided
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' });
  }

  // Check minimum password length
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  // Try to create the account in Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        // Save the name in the user metadata
        full_name: name,
      },
    },
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(201).json({
    message: 'Account created successfully! You can now log in.',
    user: {
      id:    data.user.id,
      email: data.user.email,
      name,
    },
  });
};



// Export the functions so the route file can use them
module.exports = { login, logout, register };

// ← Adiciona essa linha para ver o erro real no terminal

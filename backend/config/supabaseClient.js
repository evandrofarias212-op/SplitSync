// =============================================
// FILE: config/supabaseClient.js
// Creates and exports the Supabase connection.
// This file is imported wherever we need to
// read or write data in the database.
// =============================================

// Load the environment variables from the .env file
require('dotenv').config();

// Import the Supabase library
const { createClient } = require('@supabase/supabase-js');

// Get the URL and key from the .env file
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Create the Supabase client (our connection to the database)
const supabase = createClient(supabaseUrl, supabaseKey, supabaseServiceKey,{
  auth: {
    // Backend doesn't need to persist sessions
    persistSession: false,
    // Auto refresh not needed on server side
    autoRefreshToken: false,
    // Detect session from URL not needed on server
    detectSessionInUrl: false,
  },
  // Keep the connection alive with a global timeout
  global: {
    headers: {
      'x-connection-timeout': '30000',
    },
  },
  db: {
    // Automatically retry failed requests once
    schema: 'public',
  },
  realtime: {
    // Disable realtime to save resources
    timeout: 30000,
  },
});

// Export so other files can use this connection
module.exports = supabase;

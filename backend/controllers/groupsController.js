// =============================================
// FILE: controllers/groupsController.js
// Contains all the logic for managing groups.
// =============================================

const supabase = require('../config/supabaseClient');

// ── GET ALL GROUPS ─────────────────────────
// Returns a list of all groups from the database.
const getAllGroups = async (req, res) => {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: 'Error fetching groups.' });
  }

  return res.status(200).json(data);
};

// ── GET ONE GROUP ──────────────────────────
// Returns a single group by its ID.
// The ID comes from the URL: GET /api/groups/:id
const getGroupById = async (req, res) => {

  // Get the group ID from the URL parameter
  const { id } = req.params;

  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return res.status(404).json({ error: 'Group not found.' });
  }

  return res.status(200).json(data);
};

// ── CREATE GROUP ───────────────────────────
// Creates a new group.
// Expects: name, type (1 or 2), total_value in the request body.
const createGroup = async (req, res) => {

  const { name, type, total_value } = req.body;

  // Check if required fields were provided
  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required.' });
  }

  // Type must be 1 or 2
  if (type !== 1 && type !== 2) {
    return res.status(400).json({ error: 'Type must be 1 or 2.' });
  }

  const { data, error } = await supabase
    .from('groups')
    .insert([{ name, type, total_value: total_value || 0 }])
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: 'Error creating group.' });
  }

  return res.status(201).json({
    message: 'Group created successfully!',
    group: data,
  });
};

// ── UPDATE GROUP ───────────────────────────
// Updates an existing group by its ID.
// The ID comes from the URL: PUT /api/groups/:id
const updateGroup = async (req, res) => {

  const { id } = req.params;
  const { name, total_value } = req.body;

  const { data, error } = await supabase
    .from('groups')
    .update({ name, total_value })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: 'Error updating group.' });
  }

  return res.status(200).json({
    message: 'Group updated successfully!',
    group: data,
  });
};

// ── DELETE GROUP ───────────────────────────
// Deletes a group by its ID.
// The ID comes from the URL: DELETE /api/groups/:id
const deleteGroup = async (req, res) => {

  const { id } = req.params;

  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', id);

  if (error) {
    return res.status(500).json({ error: 'Error deleting group.' });
  }

  return res.status(200).json({ message: 'Group deleted successfully!' });
};

// Export all functions so the route file can use them
module.exports = {
  getAllGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
};
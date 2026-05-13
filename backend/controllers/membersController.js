// =============================================
// FILE: controllers/membersController.js
// Contains all the logic for managing members.
// A member always belongs to a group.
// =============================================

const supabase = require('../config/supabaseClient');
 // Import crypto to generate UUID
const crypto = require('crypto');
// ── GET ALL MEMBERS OF A GROUP ─────────────
// Returns all members that belong to a specific group.
// The group ID comes from the URL: GET /api/members/group/:groupId
const getMembersByGroup = async (req, res) => {

  const { groupId } = req.params;

  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });

  if (error) {
    return res.status(500).json({ error: 'Error fetching members.' });
  }

  return res.status(200).json(data);
};

// ── GET ONE MEMBER ─────────────────────────
// Returns a single member by their ID.
const getMemberById = async (req, res) => {

  const { id } = req.params;

  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return res.status(404).json({ error: 'Member not found.' });
  }

  return res.status(200).json(data);
};

// ── CREATE MEMBER ──────────────────────────
// Adds a new member to a group.
// If the group is type 1, calculates the individual value automatically.
// If the group is type 2, the admin sets the individual value manually.
const createMember = async (req, res) => {

  const { group_id, name, phone, individual_value, due_date } = req.body;

  // Check if required fields were provided
  if (!group_id || !name || !phone) {
    return res.status(400).json({ error: 'group_id, name and phone are required.' });
  }

  // Fetch the group to check its type and total value
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('*')
    .eq('id', group_id)
    .single();

  if (groupError || !group) {
    return res.status(404).json({ error: 'Group not found.' });
  }
 
  // Insert the new member first
  const { data: newMember, error: memberError } = await supabase
    .from('members')
    .insert([{ group_id, name, phone, individual_value: individual_value || 0, due_date,
    // Generate a unique payment token for this member
    payment_token: crypto.randomUUID(),
     }])
    
    .select()
    .single();

  if (memberError) {
    return res.status(500).json({ error: 'Error creating member.' });
  }

  // If group is type 1, recalculate individual value for ALL members equally
  if (group.type === 1) {

    // Count how many members the group has now (including the new one)
    const { data: allMembers, error: countError } = await supabase
      .from('members')
      .select('id')
      .eq('group_id', group_id);

    if (!countError && allMembers.length > 0) {

      // Divide the total value equally among all members
      const splitValue = parseFloat((group.total_value / allMembers.length).toFixed(2));

      // Update the individual value for every member in this group
      await supabase
        .from('members')
        .update({ individual_value: splitValue })
        .eq('group_id', group_id);
    }
  }

  return res.status(201).json({
    message: 'Member created successfully!',
    member: newMember,
  });
};

// ── UPDATE MEMBER ──────────────────────────
// Updates a member's info by their ID.
const updateMember = async (req, res) => {

  const { id } = req.params;
  const { name, phone, individual_value, due_date } = req.body;

  const { data, error } = await supabase
    .from('members')
    .update({ name, phone, individual_value, due_date })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: 'Error updating member.' });
  }

  return res.status(200).json({
    message: 'Member updated successfully!',
    member: data,
  });
};

// ── DELETE MEMBER ──────────────────────────
// Deletes a member by their ID.
// Also recalculates values for type 1 groups.
const deleteMember = async (req, res) => {

  const { id } = req.params;

  // First, get the member to know which group they belong to
  const { data: member, error: findError } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single();

  if (findError || !member) {
    return res.status(404).json({ error: 'Member not found.' });
  }

  // Delete the member
  const { error: deleteError } = await supabase
    .from('members')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return res.status(500).json({ error: 'Error deleting member.' });
  }

  // If the group is type 1, recalculate values for remaining members
  const { data: group } = await supabase
    .from('groups')
    .select('*')
    .eq('id', member.group_id)
    .single();

  if (group && group.type === 1) {

    const { data: remainingMembers } = await supabase
      .from('members')
      .select('id')
      .eq('group_id', member.group_id);

    if (remainingMembers && remainingMembers.length > 0) {
      const splitValue = parseFloat((group.total_value / remainingMembers.length).toFixed(2));

      await supabase
        .from('members')
        .update({ individual_value: splitValue })
        .eq('group_id', member.group_id);
    }
  }

  return res.status(200).json({ message: 'Member deleted successfully!' });
};

// Export all functions so the route file can use them
module.exports = {
  getMembersByGroup,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
};
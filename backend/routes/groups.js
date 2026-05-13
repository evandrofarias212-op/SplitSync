// =============================================
// FILE: routes/groups.js
// Defines the URL endpoints for groups.
// All routes here are protected by authMiddleware
// meaning only the logged-in admin can access them.
// =============================================

const express = require('express');
const router = express.Router();

// Import the groups controller functions
const {
  getAllGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
} = require('../controllers/groupsController');

// Import the middleware to protect all routes
const authMiddleware = require('../middlewares/authMiddleware');

// Apply the auth middleware to ALL routes in this file
// This means every request must have a valid token
router.use(authMiddleware);

// GET    /api/groups       → returns all groups
router.get('/', getAllGroups);

// GET    /api/groups/:id   → returns one group by ID
router.get('/:id', getGroupById);

// POST   /api/groups       → creates a new group
router.post('/', createGroup);

// PUT    /api/groups/:id   → updates a group by ID
router.put('/:id', updateGroup);

// DELETE /api/groups/:id   → deletes a group by ID
router.delete('/:id', deleteGroup);

module.exports = router;
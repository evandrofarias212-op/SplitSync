// =============================================
// FILE: routes/members.js
// Defines the URL endpoints for members.
// All routes are protected by authMiddleware.
// =============================================

const express = require('express');
const router = express.Router();

const {
  getMembersByGroup,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
} = require('../controllers/membersController');

const authMiddleware = require('../middlewares/authMiddleware');

// Protect all routes in this file
router.use(authMiddleware);

// GET    /api/members/group/:groupId  → all members of a group
router.get('/group/:groupId', getMembersByGroup);

// GET    /api/members/:id             → one member by ID
router.get('/:id', getMemberById);

// POST   /api/members                 → create a new member
router.post('/', createMember);

// PUT    /api/members/:id             → update a member
router.put('/:id', updateMember);

// DELETE /api/members/:id             → delete a member
router.delete('/:id', deleteMember);

module.exports = router;
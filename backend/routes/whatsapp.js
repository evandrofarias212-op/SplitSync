// =============================================
// FILE: routes/whatsapp.js
// Defines endpoints for WhatsApp messaging.
// All routes are protected by authMiddleware.
// =============================================

const express = require('express');
const router  = express.Router();

const {
  sendPaymentLink,
  sendToAllMembers,
  getLogs,
} = require('../controllers/whatsappController');

const authMiddleware = require('../middlewares/authMiddleware');

// Protect all routes
router.use(authMiddleware);

// POST /api/whatsapp/send/:memberId     → send to one member
router.post('/send/:memberId', sendPaymentLink);

// POST /api/whatsapp/send-all/:groupId  → send to all members of a group
router.post('/send-all/:groupId', sendToAllMembers);

// GET  /api/whatsapp/logs               → get message logs
router.get('/logs', getLogs);

module.exports = router;
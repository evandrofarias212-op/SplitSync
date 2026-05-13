// =============================================
// FILE: routes/payments.js
// Defines the URL endpoints for payments.
// Public routes → no login required (member access)
// Admin routes  → protected by authMiddleware
// =============================================

const express = require('express');
const router = express.Router();
const multer = require('multer');

const {
  getPaymentByToken,
  uploadReceipt,
  getAllPayments,
  confirmPayment,
  rejectPayment,
} = require('../controllers/paymentsController');

const authMiddleware = require('../middlewares/authMiddleware');

// Configure multer to store files in memory (buffer)
// instead of saving to disk, we upload directly to Supabase Storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5MB per file
  fileFilter: (req, file, cb) => {
    // Only allow images and PDFs
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPG, PNG) and PDFs are allowed.'));
    }
  },
});

// ── PUBLIC ROUTES (no login required) ──────

// GET  /api/payments/pay/:token → get member info by token
router.get('/pay/:token', getPaymentByToken);

// POST /api/payments/pay/:token → member uploads receipt
router.post('/pay/:token', upload.single('receipt'), uploadReceipt);

// ── ADMIN ROUTES (login required) ──────────

// GET  /api/payments → get all payments
router.get('/', authMiddleware, getAllPayments);

// PUT  /api/payments/:id/confirm → confirm payment + upload invoice
router.put('/:id/confirm', authMiddleware, (req, res, next) => {
  upload.single('invoice')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, confirmPayment);

// PUT  /api/payments/:id/reject → reject payment
router.put('/:id/reject', authMiddleware, rejectPayment);

module.exports = router;
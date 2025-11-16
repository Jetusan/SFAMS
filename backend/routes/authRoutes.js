const express = require('express');
const { registerStudent, loginUser } = require('../controllers/authController');

console.log('🟡 Auth routes loaded');

const router = express.Router();

// POST /api/auth/register
router.post('/register', registerStudent);

// POST /api/auth/login
router.post('/login', loginUser);

// Additional test endpoint
router.get('/status', (req, res) => {
  console.log('📍 Auth status check');
  res.json({ 
    status: 'Auth routes are active',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
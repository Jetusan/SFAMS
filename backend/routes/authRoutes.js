const express = require('express');
const { registerStudent, loginUser } = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/register
router.post('/register', registerStudent);

// POST /api/auth/login
router.post('/login', loginUser);

module.exports = router;
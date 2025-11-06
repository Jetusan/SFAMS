const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./config/db');

// Import routes - check if the file exists
let authRoutes;
try {
  authRoutes = require('./routes/authRoutes');
  console.log('✅ Auth routes imported successfully');
} catch (error) {
  console.error('❌ Error importing auth routes:', error.message);
  // Create a dummy router if the file doesn't exist
  authRoutes = express.Router();
}

const app = express();
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

// Use routes
app.use('/api/auth', authRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('Backend is running and connected to PostgreSQL');
});

// Test auth route to verify it's working
app.get('/api/auth/test', (req, res) => {
  res.json({ message: 'Auth routes are working!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
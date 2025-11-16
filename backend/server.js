const express = require('express');
const cors = require('cors');
require('dotenv').config();

console.log('🟡 Starting server initialization...');

const pool = require('./config/db');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded files

console.log('✅ Middleware setup completed');

// Import and use routes with better error handling
try {
  const authRoutes = require('./routes/authRoutes');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes mounted successfully');
} catch (error) {
  console.error('❌ Failed to load auth routes:', error.message);
  // Create a dummy router for auth routes
  const authRouter = express.Router();
  authRouter.get('/test', (req, res) => {
    res.json({ message: 'Auth routes are not available' });
  });
  app.use('/api/auth', authRouter);
}

try {
  const applicationRoutes = require('./routes/applicationRoutes');
  app.use('/api/applications', applicationRoutes);
  console.log('✅ Application routes mounted successfully');
} catch (error) {
  console.error('❌ Failed to load application routes:', error.message);
  // Create a dummy router for application routes
  const appRouter = express.Router();
  appRouter.get('/test', (req, res) => {
    res.json({ message: 'Application routes are not available' });
  });
  appRouter.get('/scholarships', (req, res) => {
    res.json({ 
      success: true, 
      scholarships: [
        { scholarship_id: 1, scholarship_name: 'TESDA Grant', description: 'Technical education scholarship' },
        { scholarship_id: 2, scholarship_name: 'CHED Scholarship', description: 'Higher education financial aid' }
      ] 
    });
  });
  app.use('/api/applications', appRouter);
}

try {
  const adminRoutes = require('./routes/adminRoutes');
  app.use('/api/admin', adminRoutes);
  console.log('✅ Admin routes mounted successfully');
} catch (error) {
  console.error('❌ Failed to load admin routes:', error.message);
  const adminRouter = express.Router();
  adminRouter.get('/test', (req, res) => {
    res.json({ message: 'Admin routes are not available' });
  });
  app.use('/api/admin', adminRouter);
}

// Test route
app.get('/', (req, res) => {
  res.send('Scholarship Management System Backend is running');
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: '✅ Healthy', 
      database: 'Connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    res.status(503).json({ 
      status: '❌ Unhealthy', 
      database: 'Disconnected',
      error: error.message 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('🚨 Unhandled error:', error);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`\n🎉 Server started successfully!`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🕒 Started at: ${new Date().toISOString()}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔶 Shutting down gracefully...');
  await pool.end();
  server.close(() => {
    console.log('✅ Server shut down successfully');
    process.exit(0);
  });
});

module.exports = app;
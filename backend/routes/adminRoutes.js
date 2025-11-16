const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

console.log('🟡 Admin routes loaded');

// ============================================
// DASHBOARD & STATISTICS
// ============================================
router.get('/dashboard/stats', adminController.getDashboardStats);

// ============================================
// STUDENT MANAGEMENT (READ, UPDATE, DELETE)
// ============================================
router.get('/students', adminController.getAllStudents);
router.get('/students/:studentId', adminController.getStudentById);
router.put('/students/:studentId', adminController.updateStudent);
router.delete('/students/:studentId', adminController.deleteStudent);

// ============================================
// APPLICATION MANAGEMENT (READ, UPDATE, DELETE)
// Note: Students create applications via /api/applications routes
// ============================================
router.get('/applications', adminController.getAllApplications);
router.get('/applications/:applicationId', adminController.getApplicationDetails);
router.put('/applications/:applicationId/status', adminController.updateApplicationStatus);
router.delete('/applications/:applicationId', adminController.deleteApplication);

// ============================================
// SCHOLARSHIP MANAGEMENT (FULL CRUD)
// ============================================
router.get('/scholarships', adminController.getAllScholarships);
router.post('/scholarships', adminController.createScholarship);
router.put('/scholarships/:scholarshipId', adminController.updateScholarship);
router.delete('/scholarships/:scholarshipId', adminController.deleteScholarship);

// ============================================
// REQUIREMENTS MANAGEMENT (FULL CRUD)
// ============================================
router.get('/requirements', adminController.getAllRequirements);
router.post('/requirements', adminController.createRequirement);
router.put('/requirements/:requirementId', adminController.updateRequirement);
router.delete('/requirements/:requirementId', adminController.deleteRequirement);

// ============================================
// EVALUATION MANAGEMENT
// ============================================
router.post('/evaluations', adminController.createEvaluation);
router.get('/applications/:applicationId/evaluations', adminController.getEvaluationsByApplication);
router.put('/evaluations/:evaluationId', adminController.updateEvaluation);

// Test endpoint
router.get('/status', (req, res) => {
    console.log('📍 Admin status check');
    res.json({ 
        status: 'Admin routes are active',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;

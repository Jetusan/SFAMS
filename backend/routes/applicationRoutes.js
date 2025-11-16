const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const upload = require('../config/multerConfig');

// Get student dashboard data
router.get('/student/:studentId/dashboard', applicationController.getStudentDashboard);

// Get all scholarships (for selection page)
router.get('/scholarships', applicationController.getAllScholarships);

// Get scholarship details with requirements - FIXED PATH
router.get('/scholarship/:scholarshipId', applicationController.getScholarshipDetails);

// Create new application - FIXED PATH (matches frontend)
router.post('/application', applicationController.createApplication);

// Upload requirement file - FIXED PATH (matches frontend)
router.post('/application/:applicationId/upload', upload.single('file'), applicationController.uploadRequirement);

// Submit application - FIXED PATH (matches frontend)
router.post('/application/:applicationId/submit', applicationController.submitApplication);

// Get application status - FIXED PATH (matches frontend)
router.get('/application/:applicationId', applicationController.getApplication);

router.get('/files/:submissionId', applicationController.serveFile);

module.exports = router;
const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

// Define status constants to avoid typos
const APPLICATION_STATUS = {
    DRAFT: 'Draft',
    PENDING: 'Pending',
    UNDER_REVIEW: 'Under Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected'
};

const SUBMISSION_STATUS = {
    NOT_SUBMITTED: 'Not Submitted',
    SUBMITTED: 'Submitted',
    VERIFIED: 'Verified',
    REJECTED: 'Rejected'
};

// Get student dashboard data
exports.getStudentDashboard = async (req, res) => {
    try {
        const { studentId } = req.params;
        console.log('Fetching dashboard for student ID:', studentId);

        // Get application statistics
        const statsQuery = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved,
                COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected,
                COUNT(CASE WHEN status = 'Under Review' THEN 1 END) as under_review
            FROM application 
            WHERE student_id = $1
        `, [studentId]);

        console.log('Stats query result:', statsQuery.rows[0]);

        // Get recent applications with scholarship details
        const applicationsQuery = await pool.query(`
            SELECT 
                a.application_id,
                a.scholarship_id,
                a.status,
                a.date_applied,
                a.remarks,
                s.scholarship_name,
                s.type as scholarship_type,
                s.sponsor
            FROM application a
            JOIN scholarship s ON a.scholarship_id = s.scholarship_id
            WHERE a.student_id = $1
            ORDER BY a.date_applied DESC
            LIMIT 5
        `, [studentId]);

        console.log('Applications query result:', applicationsQuery.rows);

        // Simplified requirements query - just get basic info for now
        const requirementsQuery = await pool.query(`
            SELECT 
                r.requirement_id,
                r.requirement_name,
                r.description,
                'Not Submitted' as status,
                s.scholarship_name
            FROM application a
            JOIN scholarship_requirements sr_link ON a.scholarship_id = sr_link.scholarship_id
            JOIN requirements r ON sr_link.requirement_id = r.requirement_id
            JOIN scholarship s ON a.scholarship_id = s.scholarship_id
            WHERE a.student_id = $1 
            ORDER BY a.date_applied DESC, r.requirement_name
            LIMIT 10
        `, [studentId]);

        console.log('Requirements query result:', requirementsQuery.rows);

        const stats = statsQuery.rows[0];
        
        res.json({
            success: true,
            data: {
                applicationStats: {
                    total: parseInt(stats.total),
                    pending: parseInt(stats.pending),
                    approved: parseInt(stats.approved),
                    rejected: parseInt(stats.rejected),
                    under_review: parseInt(stats.under_review)
                },
                recentApplications: applicationsQuery.rows,
                pendingRequirements: requirementsQuery.rows
            }
        });
    } catch (error) {
        console.error('Error fetching student dashboard:', error);
        console.error('Error details:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data',
            error: error.message
        });
    }
};

// Get all active scholarships
exports.getAllScholarships = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT scholarship_id, scholarship_name, type, description, sponsor, eligibility_criteria 
            FROM scholarship 
            ORDER BY scholarship_name
        `);
        
        res.json({
            success: true,
            scholarships: result.rows
        });
    } catch (error) {
        console.error('Error fetching scholarships:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch scholarships'
        });
    }
};

// Get scholarship details with requirements
exports.getScholarshipDetails = async (req, res) => {
    try {
        const { scholarshipId } = req.params;

        // Get scholarship basic info
        const scholarshipQuery = await pool.query(`
            SELECT scholarship_id, scholarship_name, type, description, sponsor, eligibility_criteria 
            FROM scholarship 
            WHERE scholarship_id = $1
        `, [scholarshipId]);

        if (scholarshipQuery.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Scholarship not found'
            });
        }

        // Get requirements for this scholarship
        const requirementsQuery = await pool.query(`
            SELECT r.requirement_id, r.requirement_name, r.description
            FROM requirements r
            INNER JOIN scholarship_requirements sr ON r.requirement_id = sr.requirement_id
            WHERE sr.scholarship_id = $1
        `, [scholarshipId]);

        const scholarship = scholarshipQuery.rows[0];
        scholarship.requirements = requirementsQuery.rows;

        res.json({
            success: true,
            scholarship: scholarship
        });
    } catch (error) {
        console.error('Error fetching scholarship details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch scholarship details'
        });
    }
};

// Create new application
exports.createApplication = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { scholarship_id, student_id } = req.body;

        // Input validation
        if (!scholarship_id || !student_id) {
            return res.status(400).json({
                success: false,
                message: 'Scholarship ID and Student ID are required'
            });
        }

        // Validate they are integers
        const scholarshipId = parseInt(scholarship_id);
        const studentId = parseInt(student_id);
        
        if (isNaN(scholarshipId) || isNaN(studentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ID format'
            });
        }

        await client.query('BEGIN');

        // Validate scholarship exists
        const scholarshipCheck = await client.query(
            'SELECT scholarship_id FROM scholarship WHERE scholarship_id = $1',
            [scholarshipId]
        );

        if (scholarshipCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Scholarship not found'
            });
        }

        // Check if student already has an active application for this scholarship
        const existingApp = await client.query(`
            SELECT application_id FROM application 
            WHERE student_id = $1 AND scholarship_id = $2 AND status IN ($3, $4)
        `, [studentId, scholarshipId, APPLICATION_STATUS.PENDING, APPLICATION_STATUS.DRAFT]);

        if (existingApp.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'You already have an active application for this scholarship'
            });
        }

        // Create application
        const result = await client.query(`
            INSERT INTO application (student_id, scholarship_id, status, remarks)
            VALUES ($1, $2, $3, $4)
            RETURNING application_id
        `, [studentId, scholarshipId, APPLICATION_STATUS.DRAFT, 'Application started']);

        const applicationId = result.rows[0].application_id;

        // Get requirements for this scholarship to initialize submitted_requirements
        const requirements = await client.query(`
            SELECT r.requirement_id
            FROM requirements r
            INNER JOIN scholarship_requirements sr ON r.requirement_id = sr.requirement_id
            WHERE sr.scholarship_id = $1
        `, [scholarshipId]);

        // Initialize submitted_requirements records
        for (const req of requirements.rows) {
            await client.query(`
                INSERT INTO submitted_requirements (application_id, requirement_id, status)
                VALUES ($1, $2, $3)
            `, [applicationId, req.requirement_id, SUBMISSION_STATUS.NOT_SUBMITTED]);
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            application_id: applicationId,
            message: 'Application created successfully'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating application:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create application'
        });
    } finally {
        client.release();
    }
};

// Upload requirement file 
exports.uploadRequirement = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { requirementId } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Add student authorization check (assuming you have user info in req)
        // Uncomment and modify this when you implement authentication
        /*
        const ownershipCheck = await pool.query(`
            SELECT application_id FROM application 
            WHERE application_id = $1 AND student_id = $2
        `, [applicationId, req.user.student_id]);

        if (ownershipCheck.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        */

        // File type validation
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            // Delete the uploaded file if type is invalid
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                success: false,
                message: 'Invalid file type. Only JPEG, PNG, and PDF files are allowed.'
            });
        }

        // Check file size (if not handled by multer)
        if (req.file.size > 5 * 1024 * 1024) { // 5MB
            // Delete the uploaded file if size is too large
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                success: false,
                message: 'File size too large. Maximum size is 5MB.'
            });
        }

        // Verify application exists
        const appCheck = await pool.query(`
            SELECT application_id FROM application WHERE application_id = $1
        `, [applicationId]);

        if (appCheck.rows.length === 0) {
            // Delete the uploaded file if application not found
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        // Verify requirement is valid for this scholarship
        const requirementCheck = await pool.query(`
            SELECT sr.requirement_id 
            FROM scholarship_requirements sr
            INNER JOIN application a ON sr.scholarship_id = a.scholarship_id
            WHERE a.application_id = $1 AND sr.requirement_id = $2
        `, [applicationId, requirementId]);

        if (requirementCheck.rows.length === 0) {
            // Delete the uploaded file if requirement is invalid
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                success: false,
                message: 'Invalid requirement for this scholarship'
            });
        }

        // Create file path for storage
        const filePath = `uploads/requirements/${req.file.filename}`;

        // Update or insert submitted requirement
        const existingSubmission = await pool.query(`
            SELECT submission_id FROM submitted_requirements 
            WHERE application_id = $1 AND requirement_id = $2
        `, [applicationId, requirementId]);

        if (existingSubmission.rows.length > 0) {
            // Update existing submission
            await pool.query(`
                UPDATE submitted_requirements 
                SET date_submitted = CURRENT_TIMESTAMP, 
                    status = $1,
                    file_name = $2,
                    file_path = $3
                WHERE application_id = $4 AND requirement_id = $5
            `, [
                SUBMISSION_STATUS.SUBMITTED,
                req.file.originalname,
                filePath,
                applicationId,
                requirementId
            ]);
        } else {
            // Insert new submission
            await pool.query(`
                INSERT INTO submitted_requirements 
                (application_id, requirement_id, file_name, file_path, status)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                applicationId,
                requirementId,
                req.file.originalname,
                filePath,
                SUBMISSION_STATUS.SUBMITTED
            ]);
        }

        // Update application
        await pool.query(`
            UPDATE application SET date_applied = CURRENT_TIMESTAMP 
            WHERE application_id = $1
        `, [applicationId]);

        res.json({
            success: true,
            message: 'File uploaded successfully',
            file: {
                originalName: req.file.originalname,
                storageName: req.file.filename,
                filePath: filePath
            }
        });

    } catch (error) {
        // Delete the uploaded file if database operation failed
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Error uploading file:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload file'
        });
    }
};

// Submit application
exports.submitApplication = async (req, res) => {
    try {
        const { applicationId } = req.params;

        // Add student authorization check (uncomment when implementing auth)
        /*
        const ownershipCheck = await pool.query(`
            SELECT application_id FROM application 
            WHERE application_id = $1 AND student_id = $2
        `, [applicationId, req.user.student_id]);

        if (ownershipCheck.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        */

        // Check if all requirements are submitted
        const missingRequirements = await pool.query(`
            SELECT r.requirement_name
            FROM requirements r
            INNER JOIN scholarship_requirements sr ON r.requirement_id = sr.requirement_id
            INNER JOIN application a ON sr.scholarship_id = a.scholarship_id
            LEFT JOIN submitted_requirements sub ON r.requirement_id = sub.requirement_id AND sub.application_id = a.application_id
            WHERE a.application_id = $1 AND (sub.submission_id IS NULL OR sub.status = $2)
        `, [applicationId, SUBMISSION_STATUS.NOT_SUBMITTED]);

        if (missingRequirements.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Please upload all required documents',
                missing_requirements: missingRequirements.rows.map(req => req.requirement_name)
            });
        }

        // Update application status to submitted
        await pool.query(`
            UPDATE application 
            SET status = $1, 
                date_applied = CURRENT_TIMESTAMP,
                remarks = $2
            WHERE application_id = $3
        `, [APPLICATION_STATUS.PENDING, 'Application submitted for review', applicationId]);

        res.json({
            success: true,
            message: 'Application submitted successfully',
            application_id: applicationId
        });

    } catch (error) {
        console.error('Error submitting application:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit application'
        });
    }
};

// Get application status
exports.getApplication = async (req, res) => {
    try {
        const { applicationId } = req.params;

        // Add student authorization check (uncomment when implementing auth)
        /*
        const ownershipCheck = await pool.query(`
            SELECT application_id FROM application 
            WHERE application_id = $1 AND student_id = $2
        `, [applicationId, req.user.student_id]);

        if (ownershipCheck.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        */

        const application = await pool.query(`
            SELECT a.*, s.scholarship_name, s.type as scholarship_type
            FROM application a
            INNER JOIN scholarship s ON a.scholarship_id = s.scholarship_id
            WHERE a.application_id = $1
        `, [applicationId]);

        if (application.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        const requirements = await pool.query(`
            SELECT sr.submission_id, r.requirement_id, r.requirement_name, r.description,
                   sr.file_name, sr.file_path, sr.status as submission_status,
                   sr.date_submitted
            FROM submitted_requirements sr
            INNER JOIN requirements r ON sr.requirement_id = r.requirement_id
            WHERE sr.application_id = $1
            ORDER BY r.requirement_name
        `, [applicationId]);

        const appData = application.rows[0];
        appData.requirements = requirements.rows;

        res.json({
            success: true,
            application: appData
        });

    } catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch application'
        });
    }
};

// Serve uploaded files
exports.serveFile = async (req, res) => {
    try {
        const { submissionId } = req.params;

        const fileQuery = await pool.query(`
            SELECT file_path, file_name 
            FROM submitted_requirements 
            WHERE submission_id = $1
        `, [submissionId]);

        if (fileQuery.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        const fileRecord = fileQuery.rows[0];
        
        // Construct full file path
        const filePath = path.join(__dirname, '..', fileRecord.file_path);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File not found on server'
            });
        }

        // Set appropriate headers and send file
        res.setHeader('Content-Disposition', `inline; filename="${fileRecord.file_name}"`);
        res.sendFile(filePath);

    } catch (error) {
        console.error('Error serving file:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to serve file'
        });
    }
};
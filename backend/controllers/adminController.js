const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

const APPLICATION_STATUS = {
    DRAFT: 'Draft',
    PENDING: 'Pending',
    UNDER_REVIEW: 'Under Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected'
};

// ============================================
// DASHBOARD & STATISTICS
// ============================================

exports.getDashboardStats = async (req, res) => {
    try {
        const studentsCount = await pool.query('SELECT COUNT(*) as count FROM student');
        const applicationsCount = await pool.query('SELECT COUNT(*) as count FROM application');
        const pendingCount = await pool.query('SELECT COUNT(*) as count FROM application WHERE status = $1', [APPLICATION_STATUS.PENDING]);
        const scholarshipsCount = await pool.query('SELECT COUNT(*) as count FROM scholarship');
        
        res.json({
            success: true,
            stats: {
                totalStudents: parseInt(studentsCount.rows[0].count),
                totalApplications: parseInt(applicationsCount.rows[0].count),
                pendingApplications: parseInt(pendingCount.rows[0].count),
                totalScholarships: parseInt(scholarshipsCount.rows[0].count)
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard statistics' });
    }
};

// ============================================
// STUDENT MANAGEMENT (READ, UPDATE, DELETE)
// Students are created through registration, not by admin
// ============================================

exports.getAllStudents = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                s.student_id,
                s.student_number,
                s.first_name,
                s.last_name,
                s.gender,
                s.birthdate,
                s.program,
                s.year_level,
                s.contact_number,
                s.email_address,
                COUNT(a.application_id) as total_applications
            FROM student s
            LEFT JOIN application a ON s.student_id = a.student_id
            GROUP BY s.student_id
            ORDER BY s.student_id DESC
        `);
        
        res.json({ success: true, students: result.rows });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch students' });
    }
};

exports.getStudentById = async (req, res) => {
    try {
        const { studentId } = req.params;
        
        const studentResult = await pool.query('SELECT * FROM student WHERE student_id = $1', [studentId]);
        
        if (studentResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        
        const applicationsResult = await pool.query(`
            SELECT a.*, s.scholarship_name
            FROM application a
            INNER JOIN scholarship s ON a.scholarship_id = s.scholarship_id
            WHERE a.student_id = $1
            ORDER BY a.date_applied DESC
        `, [studentId]);
        
        res.json({ 
            success: true, 
            student: studentResult.rows[0], 
            applications: applicationsResult.rows 
        });
    } catch (error) {
        console.error('Error fetching student details:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch student details' });
    }
};

exports.updateStudent = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { first_name, last_name, gender, birthdate, program, year_level, contact_number, email_address } = req.body;
        
        const result = await pool.query(`
            UPDATE student 
            SET first_name = $1, last_name = $2, gender = $3, birthdate = $4,
                program = $5, year_level = $6, contact_number = $7, email_address = $8
            WHERE student_id = $9 
            RETURNING *
        `, [first_name, last_name, gender, birthdate, program, year_level, contact_number, email_address, studentId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        
        res.json({ success: true, message: 'Student updated successfully', student: result.rows[0] });
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ success: false, message: 'Failed to update student' });
    }
};

exports.deleteStudent = async (req, res) => {
    const client = await pool.connect();
    try {
        const { studentId } = req.params;
        await client.query('BEGIN');
        
        // Check if student has applications
        const appCheck = await client.query('SELECT COUNT(*) as count FROM application WHERE student_id = $1', [studentId]);
        if (parseInt(appCheck.rows[0].count) > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete student with existing applications. Delete applications first.' 
            });
        }
        
        // Delete user account first
        await client.query('DELETE FROM user_account WHERE student_id = $1', [studentId]);
        
        // Delete student
        const result = await client.query('DELETE FROM student WHERE student_id = $1 RETURNING *', [studentId]);
        
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        
        await client.query('COMMIT');
        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting student:', error);
        res.status(500).json({ success: false, message: 'Failed to delete student' });
    } finally {
        client.release();
    }
};

// ============================================
// APPLICATION MANAGEMENT (READ, UPDATE, DELETE)
// NOTE: Students CREATE applications, admins only review/manage them
// ============================================

exports.getAllApplications = async (req, res) => {
    try {
        const { status, scholarshipId } = req.query;
        
        let query = `
            SELECT 
                a.application_id,
                a.student_id,
                a.scholarship_id,
                a.date_applied,
                a.status,
                a.remarks,
                s.first_name,
                s.last_name,
                s.student_number,
                s.email_address,
                sch.scholarship_name,
                sch.type as scholarship_type
            FROM application a
            INNER JOIN student s ON a.student_id = s.student_id
            INNER JOIN scholarship sch ON a.scholarship_id = sch.scholarship_id
        `;
        
        const conditions = [];
        const params = [];
        
        if (status) {
            conditions.push(`a.status = $${params.length + 1}`);
            params.push(status);
        }
        
        if (scholarshipId) {
            conditions.push(`a.scholarship_id = $${params.length + 1}`);
            params.push(scholarshipId);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY a.date_applied DESC';
        
        const result = await pool.query(query, params);
        res.json({ success: true, applications: result.rows });
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch applications' });
    }
};

exports.getApplicationDetails = async (req, res) => {
    try {
        const { applicationId } = req.params;
        
        // Get application with student and scholarship details
        const appResult = await pool.query(`
            SELECT 
                a.*,
                s.first_name,
                s.last_name,
                s.student_number,
                s.email_address,
                s.contact_number,
                s.program,
                s.year_level,
                sch.scholarship_name,
                sch.type,
                sch.description,
                sch.sponsor
            FROM application a
            INNER JOIN student s ON a.student_id = s.student_id
            INNER JOIN scholarship sch ON a.scholarship_id = sch.scholarship_id
            WHERE a.application_id = $1
        `, [applicationId]);
        
        if (appResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }
        
        // Get submitted requirements with file details
        const reqResult = await pool.query(`
            SELECT 
                sr.submission_id,
                sr.requirement_id,
                sr.date_submitted,
                sr.status,
                sr.file_name,
                sr.file_path,
                r.requirement_name,
                r.description
            FROM submitted_requirements sr
            INNER JOIN requirements r ON sr.requirement_id = r.requirement_id
            WHERE sr.application_id = $1
            ORDER BY r.requirement_name
        `, [applicationId]);
        
        // Get evaluations
        const evalResult = await pool.query(`
            SELECT *
            FROM evaluation
            WHERE application_id = $1
            ORDER BY date_evaluated DESC
        `, [applicationId]);
        
        res.json({ 
            success: true, 
            application: appResult.rows[0], 
            requirements: reqResult.rows,
            evaluations: evalResult.rows
        });
    } catch (error) {
        console.error('Error fetching application details:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch application details' });
    }
};

exports.updateApplicationStatus = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { status, remarks } = req.body;
        
        // Validate status
        const validStatuses = Object.values(APPLICATION_STATUS);
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status value' });
        }
        
        const result = await pool.query(
            'UPDATE application SET status = $1, remarks = $2 WHERE application_id = $3 RETURNING *',
            [status, remarks, applicationId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }
        
        res.json({ 
            success: true, 
            message: 'Application status updated successfully', 
            application: result.rows[0] 
        });
    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({ success: false, message: 'Failed to update application status' });
    }
};

exports.deleteApplication = async (req, res) => {
    const client = await pool.connect();
    try {
        const { applicationId } = req.params;
        await client.query('BEGIN');
        
        // Delete evaluations first
        await client.query('DELETE FROM evaluation WHERE application_id = $1', [applicationId]);
        
        // Get uploaded files to delete them
        const filesResult = await client.query(
            'SELECT file_path FROM submitted_requirements WHERE application_id = $1 AND file_path IS NOT NULL',
            [applicationId]
        );
        
        // Delete files from filesystem
        for (const row of filesResult.rows) {
            const filePath = path.join(__dirname, '..', row.file_path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        // Delete submitted requirements
        await client.query('DELETE FROM submitted_requirements WHERE application_id = $1', [applicationId]);
        
        // Delete application
        const result = await client.query('DELETE FROM application WHERE application_id = $1 RETURNING *', [applicationId]);
        
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Application not found' });
        }
        
        await client.query('COMMIT');
        res.json({ success: true, message: 'Application deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting application:', error);
        res.status(500).json({ success: false, message: 'Failed to delete application' });
    } finally {
        client.release();
    }
};

// ============================================
// SCHOLARSHIP MANAGEMENT (CREATE, READ, UPDATE, DELETE)
// Admins manage scholarships
// ============================================

exports.getAllScholarships = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                s.*,
                COUNT(DISTINCT a.application_id) as total_applications,
                COUNT(DISTINCT sr.requirement_id) as total_requirements
            FROM scholarship s
            LEFT JOIN application a ON s.scholarship_id = a.scholarship_id
            LEFT JOIN scholarship_requirements sr ON s.scholarship_id = sr.scholarship_id
            GROUP BY s.scholarship_id
            ORDER BY s.scholarship_name
        `);
        
        res.json({ success: true, scholarships: result.rows });
    } catch (error) {
        console.error('Error fetching scholarships:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch scholarships' });
    }
};

exports.createScholarship = async (req, res) => {
    try {
        const { scholarship_name, type, description, sponsor, eligibility_criteria } = req.body;
        
        const result = await pool.query(
            'INSERT INTO scholarship (scholarship_name, type, description, sponsor, eligibility_criteria) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [scholarship_name, type, description, sponsor, eligibility_criteria]
        );
        
        res.status(201).json({ 
            success: true, 
            message: 'Scholarship created successfully', 
            scholarship: result.rows[0] 
        });
    } catch (error) {
        console.error('Error creating scholarship:', error);
        res.status(500).json({ success: false, message: 'Failed to create scholarship' });
    }
};

exports.updateScholarship = async (req, res) => {
    try {
        const { scholarshipId } = req.params;
        const { scholarship_name, type, description, sponsor, eligibility_criteria } = req.body;
        
        const result = await pool.query(`
            UPDATE scholarship 
            SET scholarship_name = COALESCE($1, scholarship_name),
                type = COALESCE($2, type),
                description = COALESCE($3, description),
                sponsor = COALESCE($4, sponsor),
                eligibility_criteria = COALESCE($5, eligibility_criteria)
            WHERE scholarship_id = $6 
            RETURNING *
        `, [scholarship_name, type, description, sponsor, eligibility_criteria, scholarshipId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Scholarship not found' });
        }
        
        res.json({ 
            success: true, 
            message: 'Scholarship updated successfully', 
            scholarship: result.rows[0] 
        });
    } catch (error) {
        console.error('Error updating scholarship:', error);
        res.status(500).json({ success: false, message: 'Failed to update scholarship' });
    }
};

exports.deleteScholarship = async (req, res) => {
    const client = await pool.connect();
    try {
        const { scholarshipId } = req.params;
        await client.query('BEGIN');
        
        // Check if scholarship has applications
        const appCheck = await client.query('SELECT COUNT(*) as count FROM application WHERE scholarship_id = $1', [scholarshipId]);
        if (parseInt(appCheck.rows[0].count) > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete scholarship with existing applications' 
            });
        }
        
        // Delete scholarship requirements links
        await client.query('DELETE FROM scholarship_requirements WHERE scholarship_id = $1', [scholarshipId]);
        
        // Delete scholarship
        const result = await client.query('DELETE FROM scholarship WHERE scholarship_id = $1 RETURNING *', [scholarshipId]);
        
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Scholarship not found' });
        }
        
        await client.query('COMMIT');
        res.json({ success: true, message: 'Scholarship deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting scholarship:', error);
        res.status(500).json({ success: false, message: 'Failed to delete scholarship' });
    } finally {
        client.release();
    }
};

// ============================================
// REQUIREMENTS MANAGEMENT (CREATE, READ, UPDATE, DELETE)
// Admins manage requirements
// ============================================

exports.getAllRequirements = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                r.*,
                COUNT(DISTINCT sr.scholarship_id) as used_in_scholarships
            FROM requirements r
            LEFT JOIN scholarship_requirements sr ON r.requirement_id = sr.requirement_id
            GROUP BY r.requirement_id
            ORDER BY r.requirement_name
        `);
        
        res.json({ success: true, requirements: result.rows });
    } catch (error) {
        console.error('Error fetching requirements:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch requirements' });
    }
};

exports.createRequirement = async (req, res) => {
    try {
        const { requirement_name, description } = req.body;
        
        const result = await pool.query(
            'INSERT INTO requirements (requirement_name, description) VALUES ($1, $2) RETURNING *',
            [requirement_name, description]
        );
        
        res.status(201).json({ 
            success: true, 
            message: 'Requirement created successfully', 
            requirement: result.rows[0] 
        });
    } catch (error) {
        console.error('Error creating requirement:', error);
        res.status(500).json({ success: false, message: 'Failed to create requirement' });
    }
};

exports.updateRequirement = async (req, res) => {
    try {
        const { requirementId } = req.params;
        const { requirement_name, description } = req.body;
        
        const result = await pool.query(
            'UPDATE requirements SET requirement_name = COALESCE($1, requirement_name), description = COALESCE($2, description) WHERE requirement_id = $3 RETURNING *',
            [requirement_name, description, requirementId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Requirement not found' });
        }
        
        res.json({ 
            success: true, 
            message: 'Requirement updated successfully', 
            requirement: result.rows[0] 
        });
    } catch (error) {
        console.error('Error updating requirement:', error);
        res.status(500).json({ success: false, message: 'Failed to update requirement' });
    }
};

exports.deleteRequirement = async (req, res) => {
    const client = await pool.connect();
    try {
        const { requirementId } = req.params;
        await client.query('BEGIN');
        
        // Delete scholarship requirement links
        await client.query('DELETE FROM scholarship_requirements WHERE requirement_id = $1', [requirementId]);
        
        // Delete submitted requirements
        await client.query('DELETE FROM submitted_requirements WHERE requirement_id = $1', [requirementId]);
        
        // Delete requirement
        const result = await client.query('DELETE FROM requirements WHERE requirement_id = $1 RETURNING *', [requirementId]);
        
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Requirement not found' });
        }
        
        await client.query('COMMIT');
        res.json({ success: true, message: 'Requirement deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting requirement:', error);
        res.status(500).json({ success: false, message: 'Failed to delete requirement' });
    } finally {
        client.release();
    }
};

// ============================================
// EVALUATION MANAGEMENT (CREATE, READ, UPDATE)
// Admins evaluate applications
// ============================================

exports.createEvaluation = async (req, res) => {
    try {
        const { application_id, evaluator_name, score, comments } = req.body;
        
        const result = await pool.query(
            'INSERT INTO evaluation (application_id, evaluator_name, score, comments, date_evaluated) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *',
            [application_id, evaluator_name, score, comments]
        );
        
        res.status(201).json({ 
            success: true, 
            message: 'Evaluation created successfully', 
            evaluation: result.rows[0] 
        });
    } catch (error) {
        console.error('Error creating evaluation:', error);
        res.status(500).json({ success: false, message: 'Failed to create evaluation' });
    }
};

exports.getEvaluationsByApplication = async (req, res) => {
    try {
        const { applicationId } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM evaluation WHERE application_id = $1 ORDER BY date_evaluated DESC',
            [applicationId]
        );
        
        res.json({ success: true, evaluations: result.rows });
    } catch (error) {
        console.error('Error fetching evaluations:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch evaluations' });
    }
};

exports.updateEvaluation = async (req, res) => {
    try {
        const { evaluationId } = req.params;
        const { score, comments } = req.body;
        
        const result = await pool.query(
            'UPDATE evaluation SET score = COALESCE($1, score), comments = COALESCE($2, comments) WHERE evaluation_id = $3 RETURNING *',
            [score, comments, evaluationId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Evaluation not found' });
        }
        
        res.json({ 
            success: true, 
            message: 'Evaluation updated successfully', 
            evaluation: result.rows[0] 
        });
    } catch (error) {
        console.error('Error updating evaluation:', error);
        res.status(500).json({ success: false, message: 'Failed to update evaluation' });
    }
};

module.exports = exports;

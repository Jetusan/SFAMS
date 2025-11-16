require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

async function populateTestData() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting to populate test data...');
    
    // Insert more students
    console.log('👥 Adding more students...');
    const studentInserts = [
      {
        student_number: 'STU-2025-1001',
        first_name: 'Maria',
        last_name: 'Santos',
        gender: 'female',
        birthdate: '2002-03-15',
        program: 'Computer Science',
        year_level: '3rd Year',
        contact_number: '09171234567',
        email_address: 'maria.santos@email.com'
      },
      {
        student_number: 'STU-2025-1002',
        first_name: 'Juan',
        last_name: 'Cruz',
        gender: 'male',
        birthdate: '2001-08-22',
        program: 'Engineering',
        year_level: '4th Year',
        contact_number: '09181234567',
        email_address: 'juan.cruz@email.com'
      },
      {
        student_number: 'STU-2025-1003',
        first_name: 'Ana',
        last_name: 'Reyes',
        gender: 'female',
        birthdate: '2003-01-10',
        program: 'Business Administration',
        year_level: '2nd Year',
        contact_number: '09191234567',
        email_address: 'ana.reyes@email.com'
      },
      {
        student_number: 'STU-2025-1004',
        first_name: 'Carlos',
        last_name: 'Garcia',
        gender: 'male',
        birthdate: '2002-11-05',
        program: 'Information Technology',
        year_level: '3rd Year',
        contact_number: '09201234567',
        email_address: 'carlos.garcia@email.com'
      },
      {
        student_number: 'STU-2025-1005',
        first_name: 'Sofia',
        last_name: 'Mendoza',
        gender: 'female',
        birthdate: '2003-07-18',
        program: 'Education',
        year_level: '1st Year',
        contact_number: '09211234567',
        email_address: 'sofia.mendoza@email.com'
      }
    ];

    for (const student of studentInserts) {
      await client.query(`
        INSERT INTO student (student_number, first_name, last_name, gender, birthdate, program, year_level, contact_number, email_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        student.student_number, student.first_name, student.last_name,
        student.gender, student.birthdate, student.program,
        student.year_level, student.contact_number, student.email_address
      ]);
    }

    // Create user accounts for new students
    console.log('🔐 Creating user accounts...');
    const bcrypt = require('bcryptjs');
    const defaultPassword = await bcrypt.hash('password123', 10);

    const userAccounts = [
      { username: 'maria_santos', student_id: 2 },
      { username: 'juan_cruz', student_id: 3 },
      { username: 'ana_reyes', student_id: 4 },
      { username: 'carlos_garcia', student_id: 5 },
      { username: 'sofia_mendoza', student_id: 6 }
    ];

    for (const account of userAccounts) {
      await client.query(`
        INSERT INTO user_account (username, password_hash, role, student_id)
        VALUES ($1, $2, 'Student', $3)
      `, [account.username, defaultPassword, account.student_id]);
    }

    // Insert scholarship applications
    console.log('📋 Adding scholarship applications...');
    const applications = [
      { student_id: 1, scholarship_id: 1, status: 'Pending', remarks: 'Under review' },
      { student_id: 2, scholarship_id: 2, status: 'Approved', remarks: 'Excellent academic performance' },
      { student_id: 3, scholarship_id: 1, status: 'Rejected', remarks: 'Did not meet GPA requirement' },
      { student_id: 4, scholarship_id: 3, status: 'Pending', remarks: 'Waiting for additional documents' },
      { student_id: 5, scholarship_id: 4, status: 'Approved', remarks: 'Qualified for work-study program' },
      { student_id: 1, scholarship_id: 2, status: 'Under Review', remarks: 'Second application pending' },
      { student_id: 2, scholarship_id: 3, status: 'Pending', remarks: 'Recently submitted' },
      { student_id: 6, scholarship_id: 1, status: 'Pending', remarks: 'New application' }
    ];

    const applicationIds = [];
    for (const app of applications) {
      const result = await client.query(`
        INSERT INTO application (student_id, scholarship_id, status, remarks, date_applied)
        VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${Math.floor(Math.random() * 30)} days')
        RETURNING application_id
      `, [app.student_id, app.scholarship_id, app.status, app.remarks]);
      applicationIds.push(result.rows[0].application_id);
    }

    // Insert submitted requirements using actual application IDs
    console.log('📄 Adding submitted requirements...');
    const submittedReqs = [
      { app_index: 0, requirement_id: 1, status: 'Verified', file_name: 'form138_jetusan.pdf' },
      { app_index: 0, requirement_id: 2, status: 'Pending Verification', file_name: 'indigency_jetusan.pdf' },
      { app_index: 1, requirement_id: 1, status: 'Verified', file_name: 'form138_maria.pdf' },
      { app_index: 1, requirement_id: 3, status: 'Verified', file_name: 'photo_maria.jpg' },
      { app_index: 2, requirement_id: 1, status: 'Rejected', file_name: 'form138_juan.pdf' },
      { app_index: 3, requirement_id: 1, status: 'Pending Verification', file_name: 'form138_ana.pdf' },
      { app_index: 4, requirement_id: 1, status: 'Verified', file_name: 'form138_carlos.pdf' },
      { app_index: 4, requirement_id: 2, status: 'Verified', file_name: 'indigency_carlos.pdf' },
      { app_index: 4, requirement_id: 3, status: 'Verified', file_name: 'photo_carlos.jpg' }
    ];

    for (const req of submittedReqs) {
      const actualAppId = applicationIds[req.app_index];
      await client.query(`
        INSERT INTO submitted_requirements (application_id, requirement_id, status, file_name, file_path, date_submitted)
        VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${Math.floor(Math.random() * 20)} days')
      `, [
        actualAppId, req.requirement_id, req.status, 
        req.file_name, `/uploads/${req.file_name}`
      ]);
    }

    // Insert evaluations using actual application IDs
    console.log('⭐ Adding evaluations...');
    const evaluations = [
      { app_index: 1, evaluator_name: 'Dr. Rodriguez', score: 85.5, comments: 'Strong academic record and financial need demonstrated' },
      { app_index: 2, evaluator_name: 'Prof. Villanueva', score: 65.0, comments: 'Below minimum GPA requirement' },
      { app_index: 4, evaluator_name: 'Ms. Torres', score: 88.0, comments: 'Excellent work ethic and commitment' },
      { app_index: 0, evaluator_name: 'Dr. Lopez', score: 78.5, comments: 'Good candidate, pending document verification' }
    ];

    for (const evaluation of evaluations) {
      const actualAppId = applicationIds[evaluation.app_index];
      await client.query(`
        INSERT INTO evaluation (application_id, evaluator_name, score, comments, date_evaluated)
        VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${Math.floor(Math.random() * 15)} days')
      `, [actualAppId, evaluation.evaluator_name, evaluation.score, evaluation.comments]);
    }

    console.log('✅ Test data population completed successfully!');
    console.log('📊 Summary:');
    console.log('   - Added 5 new students');
    console.log('   - Created 5 user accounts');
    console.log('   - Added 8 scholarship applications');
    console.log('   - Added 9 submitted requirements');
    console.log('   - Added 4 evaluations');
    console.log('');
    console.log('🔑 Login credentials for testing:');
    console.log('   Student: maria_santos / password123');
    console.log('   Student: juan_cruz / password123');
    console.log('   Student: ana_reyes / password123');
    console.log('   Student: carlos_garcia / password123');
    console.log('   Student: sofia_mendoza / password123');
    console.log('   Admin: admin_1 / admin123');

  } catch (error) {
    console.error('❌ Error populating test data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

populateTestData();

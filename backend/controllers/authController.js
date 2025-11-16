const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

console.log('🟡 Auth controller loaded');

// Generate student number
const generateStudentNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `STU-${year}-${random}`;
};

// Register new student
const registerStudent = async (req, res) => {
  console.log('\n📍 POST /api/auth/register - Registration attempt');
  console.log('📦 Request body received');
  
  const client = await pool.connect();
  
  try {
    console.log('🟡 Starting database transaction...');
    await client.query('BEGIN');

    const {
      first_name,
      last_name,
      gender,
      birthdate,
      program,
      year_level,
      contact_number,
      email_address,
      username,
      password
    } = req.body;

    console.log(`👤 Registering student: ${first_name} ${last_name}`);
    console.log(`📧 Email: ${email_address}, 👤 Username: ${username}`);

    // Check if username or email already exists
    console.log('🟡 Checking for existing user...');
    const userCheck = await client.query(
      'SELECT * FROM user_account WHERE username = $1 OR student_id IN (SELECT student_id FROM student WHERE email_address = $2)',
      [username, email_address]
    );

    if (userCheck.rows.length > 0) {
      console.log('❌ Registration failed: Username or email already exists');
      return res.status(400).json({ 
        message: 'Username or email already exists' 
      });
    }
    console.log('✅ No duplicate users found');

    // 1. Create student record first
    const studentNumber = generateStudentNumber();
    console.log(`🆔 Generated student number: ${studentNumber}`);
    
    console.log('🟡 Creating student record...');
    const studentResult = await client.query(
      `INSERT INTO student (
        student_number, first_name, last_name, gender, birthdate, 
        program, year_level, contact_number, email_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING student_id, student_number, first_name, last_name, email_address`,
      [studentNumber, first_name, last_name, gender, birthdate, 
       program, year_level, contact_number, email_address]
    );
    console.log('✅ Student record created');

    // 2. Hash password and create user account
    console.log('🟡 Hashing password...');
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    console.log('🟡 Creating user account...');
    await client.query(
      `INSERT INTO user_account (
        username, password_hash, role, student_id
      ) VALUES ($1, $2, $3, $4)`,
      [username, passwordHash, 'Student', studentResult.rows[0].student_id]
    );
    console.log('✅ User account created');

    await client.query('COMMIT');
    console.log('✅ Database transaction committed');

    console.log(`🎉 Registration successful for: ${first_name} ${last_name}`);
    
    res.status(201).json({
      message: 'Registration successful',
      student: studentResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Registration error:', error.message);
    console.error('🔍 Error details:', error);
    
    res.status(500).json({ 
      message: 'Internal server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
    console.log('🔗 Database connection released');
  }
};

// Login user
const loginUser = async (req, res) => {
  console.log('\n📍 POST /api/auth/login - Login attempt');
  console.log('👤 Username attempting:', req.body.username);
  
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('❌ Login failed: Missing credentials');
      return res.status(400).json({ 
        message: 'Username and password are required' 
      });
    }

    // Find user with student data
    console.log('🟡 Searching for user in database...');
    const userResult = await pool.query(
      `SELECT ua.user_id, ua.username, ua.password_hash, ua.role, ua.student_id,
              s.first_name, s.last_name, s.email_address, s.student_number
       FROM user_account ua
       LEFT JOIN student s ON ua.student_id = s.student_id
       WHERE ua.username = $1`,
      [username]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ Login failed: User not found');
      return res.status(401).json({ 
        message: 'Invalid username or password' 
      });
    }

    const user = userResult.rows[0];
    console.log(`✅ User found: ${user.first_name} ${user.last_name}`);

    // Verify password
    console.log('🟡 Verifying password...');
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      console.log('❌ Login failed: Invalid password');
      return res.status(401).json({ 
        message: 'Invalid username or password' 
      });
    }
    console.log('✅ Password verified successfully');

    // Generate JWT token
    console.log('🟡 Generating JWT token...');
    const token = jwt.sign(
      { 
        userId: user.user_id, 
        username: user.username, 
        role: user.role,
        studentId: user.student_id 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );
    console.log('✅ JWT token generated');

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;

    console.log(`🎉 Login successful for: ${user.first_name} ${user.last_name}`);
    
    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('❌ Login error:', error.message);
    console.error('🔍 Error details:', error);
    
    res.status(500).json({ 
      message: 'Internal server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = { registerStudent, loginUser };
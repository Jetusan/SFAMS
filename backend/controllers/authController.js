const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate student number
const generateStudentNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `STU-${year}-${random}`;
};

// Register new student
const registerStudent = async (req, res) => {
  console.log('✅ Register endpoint hit!');
  console.log('Request body:', req.body);
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN'); // Start transaction

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

    // Check if username or email already exists
    const userCheck = await client.query(
      'SELECT * FROM user_account WHERE username = $1 OR student_id IN (SELECT student_id FROM student WHERE email_address = $2)',
      [username, email_address]
    );

    if (userCheck.rows.length > 0) {
      return res.status(400).json({ 
        message: 'Username or email already exists' 
      });
    }

    // 1. Create student record first
    const studentNumber = generateStudentNumber();
    const studentResult = await client.query(
      `INSERT INTO student (
        student_number, first_name, last_name, gender, birthdate, 
        program, year_level, contact_number, email_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING student_id, student_number, first_name, last_name, email_address`,
      [studentNumber, first_name, last_name, gender, birthdate, 
       program, year_level, contact_number, email_address]
    );

    // 2. Hash password and create user account
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await client.query(
      `INSERT INTO user_account (
        username, password_hash, role, student_id
      ) VALUES ($1, $2, $3, $4)`,
      [username, passwordHash, 'Student', studentResult.rows[0].student_id]
    );

    await client.query('COMMIT'); // Commit transaction

    res.status(201).json({
      message: 'Registration successful',
      student: studentResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Internal server error during registration' 
    });
  } finally {
    client.release();
  }
};

// Login user
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user with student data
    const userResult = await pool.query(
      `SELECT ua.user_id, ua.username, ua.password_hash, ua.role, ua.student_id,
              s.first_name, s.last_name, s.email_address, s.student_number
       FROM user_account ua
       LEFT JOIN student s ON ua.student_id = s.student_id
       WHERE ua.username = $1`,
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        message: 'Invalid username or password' 
      });
    }

    const user = userResult.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid username or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.user_id, 
        username: user.username, 
        role: user.role,
        studentId: user.student_id 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Internal server error during login' 
    });
  }
};

module.exports = { registerStudent, loginUser };
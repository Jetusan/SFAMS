const pool = require('../config/db');

(async () => {
  console.log('🔍 DEBUG VERSION - Checking database reality...\n');

  try {
    // 1. FIRST, let's see what's REALLY in submitted_requirements
    console.log('🧪 STEP 1: Checking submitted_requirements table directly...');
    
    const directCheck = await pool.query(`
      SELECT 
        COUNT(*) as total_count,
        COUNT(CASE WHEN status = 'Submitted' THEN 1 END) as submitted_count,
        COUNT(CASE WHEN status = 'Not Submitted' THEN 1 END) as not_submitted_count
      FROM submitted_requirements
    `);
    console.log('📊 submitted_requirements summary:', directCheck.rows[0]);

    // Show ALL records in submitted_requirements
    const allSubmissions = await pool.query(`
      SELECT submission_id, application_id, requirement_id, status, file_name, date_submitted
      FROM submitted_requirements 
      ORDER BY submission_id
    `);
    console.log('🔍 ALL submitted_requirements records:');
    console.table(allSubmissions.rows);

    // 2. Check applications table
    console.log('\n🧪 STEP 2: Checking applications table...');
    const allApplications = await pool.query(`
      SELECT application_id, student_id, scholarship_id, status, date_applied, remarks
      FROM application 
      ORDER BY application_id
    `);
    console.log('📝 ALL application records:');
    console.table(allApplications.rows);

    // 3. Now run your original table inspection
    console.log('\n🧪 STEP 3: Running original table inspection...');
    
    const tableQuery = `
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name;
    `;
    const { rows: tables } = await pool.query(tableQuery);

    console.log(`\n✅ Found ${tables.length} tables:\n`);

    for (const [i, table] of tables.entries()) {
      const fullName = `${table.table_schema}.${table.table_name}`;
      console.log(`📘 [${i + 1}] ${fullName}`);

      // Get columns
      const colQuery = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position;
      `;
      const { rows: cols } = await pool.query(colQuery, [table.table_schema, table.table_name]);
      cols.forEach(c => {
        console.log(`   • ${c.column_name} (${c.data_type})${c.is_nullable === 'NO' ? ' NOT NULL' : ''}${c.column_default ? ` DEFAULT ${c.column_default}` : ''}`);
      });

      // Fetch sample data - WITH ORDER BY to see newest first
      try {
        let dataQuery;
        if (table.table_name === 'submitted_requirements') {
          dataQuery = `SELECT * FROM ${table.table_schema}."${table.table_name}" ORDER BY submission_id DESC LIMIT 5`;
        } else if (table.table_name === 'application') {
          dataQuery = `SELECT * FROM ${table.table_schema}."${table.table_name}" ORDER BY application_id DESC LIMIT 5`;
        } else {
          dataQuery = `SELECT * FROM ${table.table_schema}."${table.table_name}" LIMIT 5`;
        }
        
        const { rows: sampleData } = await pool.query(dataQuery);

        if (sampleData.length > 0) {
          console.log(`   📊 Sample Data (showing ${sampleData.length} rows):`);
          console.table(sampleData);
        } else {
          console.log('   ⚪ No data found in this table.');
        }
      } catch (err) {
        console.log(`   ⚠️ Could not fetch data for ${fullName}: ${err.message}`);
      }

      console.log(''); // spacing between tables
    }

    await pool.end();
    console.log('🏁 Database inspection completed and connection closed.\n');
  } catch (err) {
    console.error('❌ Error inspecting database:', err.message);
    process.exit(1);
  }
})();
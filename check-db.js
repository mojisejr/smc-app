const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./resources/db/database.db');

console.log('Checking database schema...');

// First check table structure
db.all("PRAGMA table_info(Log)", (err, columns) => {
  if (err) {
    console.error('Error getting table info:', err);
  } else {
    console.log('Log table columns:', columns);
  }
});

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Available tables:', rows);
    
    // Check if Log table exists (singular)
    const hasLogTable = rows.some(row => row.name === 'Log');
    if (hasLogTable) {
      console.log('\nChecking recent logs...');
      db.all('SELECT * FROM Log ORDER BY createdAt DESC LIMIT 10', (err, logRows) => {
        if (err) {
          console.error('Error reading logs:', err);
        } else {
          console.log('Recent logs count:', logRows.length);
          console.log('Recent logs:', JSON.stringify(logRows, null, 2));
        }
        db.close();
      });
    } else {
      console.log('\nLog table does not exist yet.');
      db.close();
    }
  }
});
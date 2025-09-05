const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'resources', 'db', 'database.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking database structure...');

// First, check what tables exist
db.all("SELECT name FROM sqlite_master WHERE type='table';", (err, tables) => {
  if (err) {
    console.error('Error querying tables:', err.message);
    db.close();
    return;
  }
  
  console.log('\n=== Available Tables ===');
  if (tables.length === 0) {
    console.log('No tables found in database.');
    db.close();
    return;
  }
  
  tables.forEach(table => {
    console.log(`- ${table.name}`);
  });
  
  // Check if ActivationState table exists
  const hasActivationState = tables.some(t => t.name === 'ActivationState');
  const hasSettings = tables.some(t => t.name === 'Settings');
  
  if (hasActivationState) {
    db.all("SELECT * FROM ActivationState ORDER BY id DESC LIMIT 5;", (err, rows) => {
      if (err) {
        console.error('Error querying ActivationState:', err.message);
      } else {
        console.log('\n=== Activation State Records ===');
        if (rows.length === 0) {
          console.log('No activation records found.');
        } else {
          rows.forEach(row => {
            console.log(`ID: ${row.id}, Status: ${row.status}, License Type: ${row.license_type || 'N/A'}, Created: ${row.createdAt}`);
          });
        }
      }
      
      if (hasSettings) {
        db.all("SELECT * FROM Settings WHERE key = 'organization' LIMIT 1;", (err, rows) => {
          if (err) {
            console.error('Error querying Settings:', err.message);
          } else {
            console.log('\n=== Organization Settings ===');
            if (rows.length === 0) {
              console.log('No organization setting found.');
            } else {
              rows.forEach(row => {
                console.log(`Key: ${row.key}, Value: ${row.value}`);
              });
            }
          }
          db.close();
        });
      } else {
        console.log('\nSettings table does not exist.');
        db.close();
      }
    });
  } else {
     console.log('\nActivationState table does not exist.');
     
     // Check Setting table (singular) - first get its schema
      const hasSetting = tables.some(t => t.name === 'Setting');
      if (hasSetting) {
        // Get table schema first
        db.all("PRAGMA table_info(Setting);", (err, schema) => {
          if (err) {
            console.error('Error getting Setting schema:', err.message);
            db.close();
          } else {
            console.log('\n=== Setting Table Schema ===');
            schema.forEach(col => {
              console.log(`Column: ${col.name}, Type: ${col.type}`);
            });
            
            // Now get all records
            db.all("SELECT * FROM Setting LIMIT 10;", (err, rows) => {
              if (err) {
                console.error('Error querying Setting:', err.message);
              } else {
                console.log('\n=== Setting Records ===');
                if (rows.length === 0) {
                  console.log('No settings found.');
                } else {
                  rows.forEach(row => {
                    console.log('Record:', JSON.stringify(row, null, 2));
                  });
                }
              }
              db.close();
            });
          }
        });
      } else {
        console.log('Setting table does not exist.');
        db.close();
      }
   }
});
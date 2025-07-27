// Test script to validate hardware selection logic
const { execSync } = require('child_process');

console.log('🧪 Testing Hardware Selection Logic...\n');

// Check current database configuration
console.log('📊 Current Database Configuration:');
const settingsQuery = `
  SELECT 
    'KU16 Config:' as type, ku_port, ku_baudrate, 'N/A' as other_port, 'N/A' as other_baudrate, available_slots
  FROM Setting WHERE id = 1
  UNION ALL
  SELECT 
    'CU12 Config:' as type, 'N/A' as ku_port, 'N/A' as ku_baudrate, cu_port as other_port, cu_baudrate as other_baudrate, available_slots
  FROM Setting WHERE id = 1;
`;

try {
  const result = execSync(`sqlite3 "resources/db/database.db" "${settingsQuery}"`, { encoding: 'utf8' });
  console.log(result);
} catch (error) {
  console.error('Database query failed:', error.message);
}

// Hardware Detection Logic Test
console.log('🔍 Hardware Detection Test:');
console.log('Expected Behavior:');
console.log('  - If cu_port configured → CU12 mode (12 slots)');
console.log('  - If only ku_port configured → KU16 mode (15 slots)');
console.log('  - If both configured → CU12 preferred (12 slots)');
console.log('  - If neither configured → KU16 fallback (15 slots)');

console.log('\n🎯 Expected Fix Results:');
console.log('  ✅ Only ONE hardware type initializes');
console.log('  ✅ No port conflict errors');
console.log('  ✅ CU12 initialization should succeed');
console.log('  ✅ No "Resource temporarily unavailable" errors');
console.log('  ✅ Clean console output');

console.log('\n📋 Next Steps:');
console.log('  1. Start the application');
console.log('  2. Check console for "[HARDWARE] Detected:" message');
console.log('  3. Verify only one hardware type initializes');
console.log('  4. Confirm CU12 operations work without errors');

console.log('\n✅ Test completed - Ready for manual validation');
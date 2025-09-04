/**
 * Manual Testing Script for Phase 4.2 - Quick Validation
 * 
 * USAGE:
 * npx ts-node scripts/manual-test-phase4-2.ts
 * 
 * This script performs quick manual checks to validate the Phase 4.2 migration
 * without requiring the full Electron environment.
 */

import fs from 'fs';
import path from 'path';

console.log("🧪 Phase 4.2 Manual Testing - Quick Validation");
console.log("=" .repeat(50));

/**
 * Test 1: Verify all admin handlers exist
 */
function testAdminHandlersExist(): boolean {
  console.log("\n📋 Test 1: Admin Handler Files");
  
  const adminHandlers = [
    'deactivate.ts',
    'deactivateAll.ts', 
    'deactivate-admin.ts',
    'reactivate-admin.ts',
    'reactiveAll.ts'
  ];
  
  const adminPath = path.join(process.cwd(), 'main/device-controllers/ipcMain/admin');
  let allExist = true;
  
  for (const handler of adminHandlers) {
    const filePath = path.join(adminPath, handler);
    const exists = fs.existsSync(filePath);
    console.log(`  ${exists ? '✅' : '❌'} ${handler}`);
    if (!exists) allExist = false;
  }
  
  // Check index.ts
  const indexPath = path.join(adminPath, 'index.ts');
  const indexExists = fs.existsSync(indexPath);
  console.log(`  ${indexExists ? '✅' : '❌'} index.ts`);
  if (!indexExists) allExist = false;
  
  return allExist;
}

/**
 * Test 2: Verify unified registration system
 */
function testUnifiedRegistration(): boolean {
  console.log("\n📋 Test 2: Unified Registration System");
  
  const mainIndexPath = path.join(process.cwd(), 'main/device-controllers/ipcMain/index.ts');
  const exists = fs.existsSync(mainIndexPath);
  console.log(`  ${exists ? '✅' : '❌'} main/device-controllers/ipcMain/index.ts`);
  
  if (exists) {
    const content = fs.readFileSync(mainIndexPath, 'utf-8');
    const hasRegisterFunction = content.includes('registerAllDeviceHandlers');
    console.log(`  ${hasRegisterFunction ? '✅' : '❌'} registerAllDeviceHandlers function`);
    return hasRegisterFunction;
  }
  
  return false;
}

/**
 * Test 3: Verify BuildTimeController pattern in handlers
 */
function testBuildTimeControllerPattern(): boolean {
  console.log("\n📋 Test 3: BuildTimeController Pattern");
  
  const categories = ['core', 'dispensing', 'management', 'admin'];
  let allUsePattern = true;
  
  for (const category of categories) {
    const categoryPath = path.join(process.cwd(), 'main/device-controllers/ipcMain', category);
    
    if (fs.existsSync(categoryPath)) {
      const files = fs.readdirSync(categoryPath)
        .filter(f => f.endsWith('.ts') && f !== 'index.ts');
      
      for (const file of files) {
        const filePath = path.join(categoryPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Special case for getPortList which uses SerialPort.list() directly
        const isGetPortList = file === 'getPortList.ts';
        const hasBuildTimeController = isGetPortList ? 
          content.includes('SerialPort.list()') : 
          content.includes('BuildTimeController.getCurrentController()');
        const hasBrowserWindowPattern = content.includes('BrowserWindow.fromWebContents(event.sender)');
        
        // Check for KU16 references in actual code (exclude comments)
        const lines = content.split('\n');
        const hasNoKu16Dependency = !lines.some(line => {
          const trimmed = line.trim();
          // Skip comment lines
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
            return false;
          }
          // Check for actual KU16 usage in code
          return trimmed.includes('ku16:') || trimmed.includes('ku16.');
        });
        
        const patternCorrect = hasBuildTimeController && hasBrowserWindowPattern && hasNoKu16Dependency;
        
        console.log(`  ${patternCorrect ? '✅' : '❌'} ${category}/${file}`);
        if (!patternCorrect) {
          console.log(`    - BuildTimeController: ${hasBuildTimeController ? '✅' : '❌'}`);
          console.log(`    - BrowserWindow pattern: ${hasBrowserWindowPattern ? '✅' : '❌'}`);
          console.log(`    - No KU16 dependency: ${hasNoKu16Dependency ? '✅' : '❌'}`);
          allUsePattern = false;
        }
      }
    }
  }
  
  return allUsePattern;
}

/**
 * Test 4: Verify Thai error messages preservation
 */
function testThaiErrorMessages(): boolean {
  console.log("\n📋 Test 4: Thai Error Messages");
  
  const expectedMessages = [
    'รหัสผ่านไม่ถูกต้อง',
    'ไม่พบผู้ใช้งาน', 
    'ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้',
    'ปลดล็อกไม่สำเร็จกรุณาตรวจสอบรหัสผู้ใช้งานอีกครั้ง',
    'ไม่สามารถปิดช่องได้ กรุณาตรวจสอบรหัสผ่านอีกครั้ง',
    'ไม่สามารถยกเลิกการใช้งานระบบได้',
    'ไม่สามารถปิดช่องได้',
    'ไม่สามารถเปิดใช้งานระบบได้'
  ];
  
  const handlerPath = path.join(process.cwd(), 'main/device-controllers/ipcMain');
  let allMessagesFound = true;
  
  // Get all handler files
  const allFiles: string[] = [];
  const categories = ['core', 'dispensing', 'management', 'admin'];
  
  for (const category of categories) {
    const categoryPath = path.join(handlerPath, category);
    if (fs.existsSync(categoryPath)) {
      const files = fs.readdirSync(categoryPath)
        .filter(f => f.endsWith('.ts') && f !== 'index.ts')
        .map(f => path.join(categoryPath, f));
      allFiles.push(...files);
    }
  }
  
  // Read all content
  const allContent = allFiles.map(file => fs.readFileSync(file, 'utf-8')).join('\n');
  
  for (const message of expectedMessages) {
    const found = allContent.includes(message);
    console.log(`  ${found ? '✅' : '❌'} "${message}"`);
    if (!found) allMessagesFound = false;
  }
  
  return allMessagesFound;
}

/**
 * Test 5: Verify main process integration
 */
function testMainProcessIntegration(): boolean {
  console.log("\n📋 Test 5: Main Process Integration");
  
  const backgroundPath = path.join(process.cwd(), 'main/background.ts');
  const exists = fs.existsSync(backgroundPath);
  console.log(`  ${exists ? '✅' : '❌'} main/background.ts exists`);
  
  if (exists) {
    const content = fs.readFileSync(backgroundPath, 'utf-8');
    
    const hasUnifiedImport = content.includes('registerAllDeviceHandlers');
    const hasUnifiedCall = content.includes('registerAllDeviceHandlers()');
    const removedOldImports = !content.includes('./ku16/ipcMain/init') && 
                              !content.includes('./ku16/ipcMain/unlock');
    
    console.log(`  ${hasUnifiedImport ? '✅' : '❌'} Import registerAllDeviceHandlers`);
    console.log(`  ${hasUnifiedCall ? '✅' : '❌'} Call registerAllDeviceHandlers()`);
    console.log(`  ${removedOldImports ? '✅' : '❌'} Removed old KU16 imports`);
    
    return hasUnifiedImport && hasUnifiedCall && removedOldImports;
  }
  
  return false;
}

/**
 * Test 6: Verify timing patterns
 */
function testTimingPatterns(): boolean {
  console.log("\n📋 Test 6: Timing Patterns");
  
  const handlerPath = path.join(process.cwd(), 'main/device-controllers/ipcMain');
  const categories = ['dispensing', 'management', 'admin'];
  let hasTimingPatterns = false;
  
  for (const category of categories) {
    const categoryPath = path.join(handlerPath, category);
    if (fs.existsSync(categoryPath)) {
      const files = fs.readdirSync(categoryPath)
        .filter(f => f.endsWith('.ts') && f !== 'index.ts');
      
      for (const file of files) {
        const filePath = path.join(categoryPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        const has1SecondDelay = content.includes('setTimeout(resolve, 1000)') ||
                               content.includes('new Promise(resolve => setTimeout(resolve, 1000))');
        const hasCheckState = content.includes('sendCheckState()');
        
        if (has1SecondDelay && hasCheckState) {
          console.log(`  ✅ ${category}/${file} - has timing pattern`);
          hasTimingPatterns = true;
        } else if (has1SecondDelay || hasCheckState) {
          console.log(`  ⚠️ ${category}/${file} - partial timing pattern`);
        }
      }
    }
  }
  
  console.log(`  ${hasTimingPatterns ? '✅' : '❌'} Found timing patterns in handlers`);
  return hasTimingPatterns;
}

/**
 * Run all tests
 */
function runAllTests(): void {
  const results = [
    { name: "Admin Handlers", result: testAdminHandlersExist() },
    { name: "Unified Registration", result: testUnifiedRegistration() },
    { name: "BuildTimeController Pattern", result: testBuildTimeControllerPattern() },
    { name: "Thai Error Messages", result: testThaiErrorMessages() },
    { name: "Main Process Integration", result: testMainProcessIntegration() },
    { name: "Timing Patterns", result: testTimingPatterns() }
  ];
  
  const passed = results.filter(r => r.result).length;
  const total = results.length;
  const successRate = Math.round((passed / total) * 100);
  
  console.log("\n" + "=" .repeat(50));
  console.log("📊 SUMMARY");
  console.log("=" .repeat(50));
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`📈 Success Rate: ${successRate}%`);
  
  if (passed === total) {
    console.log("\n🎉 All tests passed! Phase 4.2 migration looks good.");
  } else {
    console.log("\n⚠️ Some tests failed. Review the issues above.");
    results.filter(r => !r.result).forEach(r => {
      console.log(`❌ Failed: ${r.name}`);
    });
  }
  
  console.log("\n💡 Next steps:");
  console.log("1. Run the application to test IPC handlers in runtime");
  console.log("2. Test each IPC event from the frontend");
  console.log("3. Verify BuildTimeController hardware integration");
  console.log("4. Check audit logs for proper logging");
}

// Run the tests
runAllTests();
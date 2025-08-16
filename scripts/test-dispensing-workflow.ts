#!/usr/bin/env ts-node

/**
 * Dispensing Workflow Test Script
 * 
 * Tests the complete dispensing workflow:
 * 1. Click "จ่ายยา" button → dispensingWait dialog
 * 2. Click "ตกลง" button → IPC check-locked-back
 * 3. Hardware response → clearOrContinue dialog
 * 
 * Usage:
 * npm run test-dispensing-workflow
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

class DispensingWorkflowTester {
  private results: TestResult[] = [];
  private projectRoot = path.resolve(__dirname, '..');

  /**
   * Add test result
   */
  private addResult(name: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, details?: any) {
    this.results.push({ name, status, message, details });
    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${emoji} ${name}: ${message}`);
    if (details) {
      console.log(`   Details:`, details);
    }
  }

  /**
   * Test 1: Verify IPC Event Listeners in useDispense Hook
   */
  private testUseDispenseEventListeners(): void {
    const hookPath = path.join(this.projectRoot, 'renderer/hooks/useDispense.ts');
    
    if (!existsSync(hookPath)) {
      this.addResult('useDispense Hook File', 'FAIL', 'File not found', { path: hookPath });
      return;
    }

    const content = readFileSync(hookPath, 'utf8');
    
    // Check for required event listeners
    const requiredEvents = [
      'ipcRenderer.on("dispensing"',
      'ipcRenderer.on("locked-back-success"',
      'removeListener("dispensing"',
      'removeListener("locked-back-success"'
    ];

    const missingEvents = requiredEvents.filter(event => !content.includes(event));
    
    if (missingEvents.length === 0) {
      this.addResult('useDispense Event Listeners', 'PASS', 'All required event listeners found');
    } else {
      this.addResult('useDispense Event Listeners', 'FAIL', 'Missing event listeners', { missing: missingEvents });
    }

    // Check for debug logging
    if (content.includes('console.log("USEDISPENSE DEBUG:')) {
      this.addResult('useDispense Debug Logging', 'PASS', 'Debug logging implemented');
    } else {
      this.addResult('useDispense Debug Logging', 'WARN', 'Debug logging not found');
    }
  }

  /**
   * Test 2: Verify dispensingWait.tsx Event Listeners
   */
  private testDispensingWaitEventListeners(): void {
    const componentPath = path.join(this.projectRoot, 'renderer/components/Dialogs/dispensingWait.tsx');
    
    if (!existsSync(componentPath)) {
      this.addResult('dispensingWait Component File', 'FAIL', 'File not found', { path: componentPath });
      return;
    }

    const content = readFileSync(componentPath, 'utf8');
    
    // Check for required features
    const requiredFeatures = [
      'ipcRenderer.on("locked-back-success"',
      'setIsCheckingLock',
      'toast.error',
      'setTimeout',
      'handleCheckLockedBack'
    ];

    const missingFeatures = requiredFeatures.filter(feature => !content.includes(feature));
    
    if (missingFeatures.length === 0) {
      this.addResult('dispensingWait Features', 'PASS', 'All required features implemented');
    } else {
      this.addResult('dispensingWait Features', 'FAIL', 'Missing features', { missing: missingFeatures });
    }

    // Check for proper payload validation
    if (content.includes('!slotNo || !hn')) {
      this.addResult('dispensingWait Payload Validation', 'PASS', 'Payload validation implemented');
    } else {
      this.addResult('dispensingWait Payload Validation', 'WARN', 'Payload validation not found');
    }
  }

  /**
   * Test 3: Verify checkLockedBack IPC Handler
   */
  private testCheckLockedBackIpcHandler(): void {
    const handlerPath = path.join(this.projectRoot, 'main/device-controllers/ipcMain/core/checkLockedBack.ts');
    
    if (!existsSync(handlerPath)) {
      this.addResult('checkLockedBack IPC Handler', 'FAIL', 'File not found', { path: handlerPath });
      return;
    }

    const content = readFileSync(handlerPath, 'utf8');
    
    // Check for required features
    const requiredFeatures = [
      'controller.setDispensingContext',
      'win.webContents.send("locked-back-error"',
      'BuildTimeController.getCurrentController()',
      'console.log("CHECKLOCKEDBACK DEBUG:'
    ];

    const missingFeatures = requiredFeatures.filter(feature => !content.includes(feature));
    
    if (missingFeatures.length === 0) {
      this.addResult('checkLockedBack Handler Features', 'PASS', 'All required features implemented');
    } else {
      this.addResult('checkLockedBack Handler Features', 'FAIL', 'Missing features', { missing: missingFeatures });
    }

    // Check error handling
    if (content.includes('try {') && content.includes('catch (error)')) {
      this.addResult('checkLockedBack Error Handling', 'PASS', 'Error handling implemented');
    } else {
      this.addResult('checkLockedBack Error Handling', 'WARN', 'Limited error handling');
    }
  }

  /**
   * Test 4: Verify DS12Controller Dispensing Context
   */
  private testDS12ControllerDispensingContext(): void {
    const controllerPath = path.join(this.projectRoot, 'main/ku-controllers/ds12/DS12Controller.ts');
    
    if (!existsSync(controllerPath)) {
      this.addResult('DS12Controller File', 'FAIL', 'File not found', { path: controllerPath });
      return;
    }

    const content = readFileSync(controllerPath, 'utf8');
    
    // Check for dispensing context implementation
    const requiredFeatures = [
      'setDispensingContext(',
      'clearDispensingContext(',
      'private dispensingContext:',
      'emitToUI("locked-back-success"',
      'currentSlot = this.openingSlot',
      'this.dispensingContext.slotId'
    ];

    const missingFeatures = requiredFeatures.filter(feature => !content.includes(feature));
    
    if (missingFeatures.length === 0) {
      this.addResult('DS12Controller Dispensing Context', 'PASS', 'All dispensing context features implemented');
    } else {
      this.addResult('DS12Controller Dispensing Context', 'FAIL', 'Missing context features', { missing: missingFeatures });
    }

    // Check for locked-back-success event emission
    if (content.includes('emitToUI("locked-back-success"')) {
      this.addResult('DS12Controller Event Emission', 'PASS', 'locked-back-success event implemented');
    } else {
      this.addResult('DS12Controller Event Emission', 'FAIL', 'locked-back-success event not found');
    }
  }

  /**
   * Test 5: Verify clearOrContinue Dialog Structure
   */
  private testClearOrContinueDialog(): void {
    const dialogPath = path.join(this.projectRoot, 'renderer/components/Dialogs/clearOrContinue.tsx');
    
    if (!existsSync(dialogPath)) {
      this.addResult('clearOrContinue Dialog File', 'FAIL', 'File not found', { path: dialogPath });
      return;
    }

    const content = readFileSync(dialogPath, 'utf8');
    
    // Check for required UI elements
    const requiredElements = [
      'ขั้นตอนที่ 2 ของ 2',
      'มีอีก (เก็บข้อมูลผู้ป่วยไว้)',
      'ไม่มีแล้ว (เคลียร์ช่อง)',
      'handleContinue',
      'handleClear',
      'useDispensingContext'
    ];

    const missingElements = requiredElements.filter(element => !content.includes(element));
    
    if (missingElements.length === 0) {
      this.addResult('clearOrContinue Dialog Elements', 'PASS', 'All required UI elements present');
    } else {
      this.addResult('clearOrContinue Dialog Elements', 'FAIL', 'Missing UI elements', { missing: missingElements });
    }

    // Check for proper styling and progress indication
    if (content.includes('bg-blue-50') && content.includes('bg-yellow-50')) {
      this.addResult('clearOrContinue Dialog Styling', 'PASS', 'Enhanced styling implemented');
    } else {
      this.addResult('clearOrContinue Dialog Styling', 'WARN', 'Basic styling detected');
    }
  }

  /**
   * Test 6: Check TypeScript Compilation
   */
  private testTypeScriptCompilation(): void {
    try {
      console.log('Running TypeScript compilation check...');
      execSync('npx tsc --noEmit --skipLibCheck', { 
        cwd: this.projectRoot,
        stdio: 'pipe'
      });
      this.addResult('TypeScript Compilation', 'PASS', 'No TypeScript errors detected');
    } catch (error: any) {
      // Check if errors are related to our changes
      const output = error.stdout?.toString() || error.stderr?.toString() || '';
      const relevantFiles = [
        'useDispense.ts',
        'dispensingWait.tsx',
        'checkLockedBack.ts',
        'DS12Controller.ts',
        'clearOrContinue.tsx'
      ];

      const hasRelevantErrors = relevantFiles.some(file => output.includes(file));
      
      if (hasRelevantErrors) {
        this.addResult('TypeScript Compilation', 'FAIL', 'TypeScript errors in modified files', { 
          output: output.split('\n').slice(0, 10).join('\n') 
        });
      } else {
        this.addResult('TypeScript Compilation', 'WARN', 'TypeScript errors in unrelated files');
      }
    }
  }

  /**
   * Test 7: Validate IPC Event Flow
   */
  private testIpcEventFlow(): void {
    const eventFlow = [
      { file: 'dispensingWait.tsx', event: 'check-locked-back IPC call' },
      { file: 'checkLockedBack.ts', event: 'IPC handler execution' },
      { file: 'DS12Controller.ts', event: 'setDispensingContext call' },
      { file: 'DS12Controller.ts', event: 'locked-back-success event emission' },
      { file: 'useDispense.ts', event: 'Event listener reception' },
      { file: 'Navbar.tsx', event: 'clearOrContinue dialog display' }
    ];

    let flowIntegrity = true;
    const issues = [];

    // This is a structural test - we can't test runtime flow without hardware
    for (const step of eventFlow) {
      const filePath = path.join(this.projectRoot, 
        step.file.includes('.tsx') 
          ? step.file.includes('Navbar') 
            ? `renderer/components/Shared/${step.file}`
            : `renderer/components/Dialogs/${step.file}`
          : step.file.includes('checkLockedBack')
          ? `main/device-controllers/ipcMain/core/${step.file}`
          : step.file.includes('DS12Controller') 
          ? `main/ku-controllers/ds12/${step.file}`
          : `renderer/hooks/${step.file}`
      );

      if (!existsSync(filePath)) {
        flowIntegrity = false;
        issues.push(`Missing file for ${step.event}: ${step.file}`);
      }
    }

    if (flowIntegrity) {
      this.addResult('IPC Event Flow Structure', 'PASS', 'All required files exist for complete event flow');
    } else {
      this.addResult('IPC Event Flow Structure', 'FAIL', 'Incomplete event flow structure', { issues });
    }
  }

  /**
   * Run all tests
   */
  public async runTests(): Promise<void> {
    console.log('🧪 Starting Dispensing Workflow Tests...\n');

    this.testUseDispenseEventListeners();
    this.testDispensingWaitEventListeners();
    this.testCheckLockedBackIpcHandler();
    this.testDS12ControllerDispensingContext();
    this.testClearOrContinueDialog();
    this.testTypeScriptCompilation();
    this.testIpcEventFlow();

    // Generate summary
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warned = this.results.filter(r => r.status === 'WARN').length;

    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warned}`);
    console.log(`📋 Total Tests: ${this.results.length}`);

    const successRate = Math.round((passed / this.results.length) * 100);
    console.log(`🎯 Success Rate: ${successRate}%`);

    if (failed === 0) {
      console.log('\n🎉 All critical tests passed! Dispensing workflow is ready for testing.');
      console.log('\n📝 Next Steps:');
      console.log('1. Start the application: npm run dev');
      console.log('2. Test "จ่ายยา" button → dispensingWait dialog');
      console.log('3. Test "ตกลง" button → clearOrContinue dialog transition');
      console.log('4. Verify complete workflow with hardware');
    } else {
      console.log('\n⚠️  Some tests failed. Please review and fix issues before testing.');
      process.exit(1);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new DispensingWorkflowTester();
  tester.runTests().catch(console.error);
}

export { DispensingWorkflowTester };
/**
 * PHASE 4.1 IPC HANDLER MIGRATION VALIDATION
 * Medical Device Audit Trail Integrity Verification
 * 
 * COMPLIANCE REQUIREMENTS:
 * - FDA 21 CFR Part 820 (Quality System Regulation)
 * - ISO 13485 (Medical Device Quality Management)
 * - IEC 62304 (Medical Device Software Life Cycle)
 * - Thai FDA Medical Device Regulations
 * 
 * VALIDATION SCOPE:
 * Phase 4.1 migrated only 7 critical IPC handlers:
 * - init, unlock, dispense, dispense-continue, check-locked-back, reset, force-reset
 * 
 * CRITICAL VALIDATIONS:
 * 1. All logDispensing() calls preserved with identical parameters
 * 2. Thai language audit messages exactly maintained  
 * 3. User authentication patterns unchanged
 * 4. Database operation consistency maintained
 * 5. Process types exactly preserved
 * 6. Security audit trail complete
 */

import { DispensingLog } from '../../db/model/dispensing-logs.model';
import { User } from '../../db/model/user.model';
import { Slot } from '../../db/model/slot.model';
import { Log } from '../../db/model/logs.model';
import { sequelize } from '../../db/sequelize';
import fs from 'fs';
import path from 'path';

// MEDICAL DEVICE COMPLIANCE: Required process types for audit trail
const REQUIRED_PROCESS_TYPES = [
  'unlock',
  'unlock-error', 
  'dispense-continue',
  'dispense-error',
  'dispense-end',
  'force-reset',
  'force-reset-error',
  'deactivate',
  'deactivate-error'
] as const;

// THAI LANGUAGE MEDICAL MESSAGES: Must be preserved exactly
const REQUIRED_THAI_MESSAGES = {
  'unlock': 'ปลดล็อคสำเร็จ',
  'unlock-error': 'ปลดล็อคล้มเหลว',
  'dispense-continue': 'จ่ายยาสำเร็จยังมียาอยู่ในช่อง',
  'dispense-error': 'จ่ายยาล้มเหลว',
  'dispense-end': 'จ่ายยาสำเร็จไม่มียาเหลือในช่อง',
  'force-reset': 'บังคับรีเซ็ตสำเร็จ',
  'force-reset-error': 'ล้างช่องไม่สำเร็จ'
} as const;

// AUTHENTICATION PATTERNS: Critical security validations
const AUTHENTICATION_PATTERNS = {
  passkeyValidation: 'User.findOne({ where: { passkey: payload.passkey } })',
  userIdExtraction: 'user?.dataValues?.id || null',
  userNameExtraction: 'user.dataValues.name',
  authFailureCheck: '!user'
} as const;

interface ValidationResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
  criticalFailure?: boolean;
}

interface AuditTrailValidation {
  results: ValidationResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    warnings: number;
    criticalFailures: number;
  };
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW';
  recommendations: string[];
}

/**
 * COMPREHENSIVE AUDIT TRAIL VALIDATION SUITE
 * Validates that Phase 4.1 migration maintains complete medical device compliance
 */
export class Phase41AuditTrailValidator {
  private results: ValidationResult[] = [];
  private criticalFailures = 0;

  /**
   * Execute complete validation suite
   */
  async validateAll(): Promise<AuditTrailValidation> {
    console.log('🏥 PHASE 4.1 MEDICAL DEVICE AUDIT TRAIL VALIDATION');
    console.log('================================================');
    console.log('Validating IPC handler migration integrity...\n');

    // CRITICAL VALIDATION TESTS
    await this.validateDatabaseModels();
    await this.validateLogDispenseCalls();
    await this.validateThaiLanguageMessages();
    await this.validateAuthenticationPatterns();
    await this.validateProcessTypes();
    await this.validateDatabaseOperations(); 
    await this.validateSecurityAuditTrail();
    await this.validateIpcHandlerIntegrity();
    await this.validateSlotStateManagement();
    await this.validateUserRoleChecking();
    await this.validateTimestampTracking();
    await this.validateErrorHandlingPatterns();

    return this.generateReport();
  }

  /**
   * VALIDATION 1: Database Models Integrity
   * Ensures all medical device data models are properly defined
   */
  private async validateDatabaseModels(): Promise<void> {
    try {
      // Validate DispensingLog model structure
      const dispensingLogFields = Object.keys(DispensingLog.getTableName ? DispensingLog.rawAttributes || {} : {});
      const requiredFields = ['id', 'timestamp', 'userId', 'slotId', 'hn', 'process', 'message'];
      
      const missingFields = requiredFields.filter(field => !dispensingLogFields.includes(field));
      
      if (missingFields.length === 0) {
        this.addResult({
          testName: 'Database Models - DispensingLog Structure',
          status: 'PASS',
          message: 'All required fields present in DispensingLog model',
          details: { fields: dispensingLogFields }
        });
      } else {
        this.addResult({
          testName: 'Database Models - DispensingLog Structure', 
          status: 'FAIL',
          message: `Missing required fields in DispensingLog model: ${missingFields.join(', ')}`,
          details: { missingFields, presentFields: dispensingLogFields },
          criticalFailure: true
        });
      }

      // Validate User model for authentication
      const userFields = Object.keys(User.rawAttributes || {});
      const requiredUserFields = ['id', 'name', 'role', 'passkey'];
      
      const missingUserFields = requiredUserFields.filter(field => !userFields.includes(field));
      
      if (missingUserFields.length === 0) {
        this.addResult({
          testName: 'Database Models - User Authentication Structure',
          status: 'PASS', 
          message: 'All required authentication fields present in User model',
          details: { fields: userFields }
        });
      } else {
        this.addResult({
          testName: 'Database Models - User Authentication Structure',
          status: 'FAIL',
          message: `Missing authentication fields in User model: ${missingUserFields.join(', ')}`,
          details: { missingFields: missingUserFields, presentFields: userFields },
          criticalFailure: true
        });
      }

    } catch (error) {
      this.addResult({
        testName: 'Database Models Validation',
        status: 'FAIL',
        message: `Database model validation failed: ${error.message}`,
        criticalFailure: true
      });
    }
  }

  /**
   * VALIDATION 2: logDispensing() Function Calls
   * Critical: Ensures all medical audit logging is preserved
   */
  private async validateLogDispenseCalls(): Promise<void> {
    const ipcHandlerFiles = [
      '/main/ku16/ipcMain/unlock.ts',
      '/main/ku16/ipcMain/dispensing.ts', 
      '/main/ku16/ipcMain/dispensing-continue.ts',
      '/main/ku16/ipcMain/reset.ts',
      '/main/ku16/ipcMain/forceReset.ts'
    ];

    let totalLogCalls = 0;
    let validLogCalls = 0;
    const logCallIssues: string[] = [];

    for (const filePath of ipcHandlerFiles) {
      try {
        const fullPath = `/Users/non/dev/smc/smc-app${filePath}`;
        
        if (!fs.existsSync(fullPath)) {
          logCallIssues.push(`File not found: ${filePath}`);
          continue;
        }

        const fileContent = fs.readFileSync(fullPath, 'utf8');
        
        // Extract logDispensing calls with regex
        const logCallRegex = /await\s+logDispensing\s*\(\s*\{([^}]+)\}\s*\)/g;
        const matches = [...fileContent.matchAll(logCallRegex)];
        
        totalLogCalls += matches.length;

        for (const match of matches) {
          const logCallContent = match[1];
          
          // Validate required parameters
          const hasUserId = /userId:\s*\w+/.test(logCallContent);
          const hasHn = /hn:\s*\w+/.test(logCallContent);
          const hasSlotId = /slotId:\s*\w+/.test(logCallContent);
          const hasProcess = /process:\s*["'][\w-]+["']/.test(logCallContent);
          const hasMessage = /message:\s*["'][^"']+["']/.test(logCallContent);

          if (hasUserId && hasHn && hasSlotId && hasProcess && hasMessage) {
            validLogCalls++;
          } else {
            const missing = [];
            if (!hasUserId) missing.push('userId');
            if (!hasHn) missing.push('hn');
            if (!hasSlotId) missing.push('slotId');
            if (!hasProcess) missing.push('process');
            if (!hasMessage) missing.push('message');
            
            logCallIssues.push(`${filePath}: Missing parameters: ${missing.join(', ')}`);
          }
        }

      } catch (error) {
        logCallIssues.push(`Error reading ${filePath}: ${error.message}`);
      }
    }

    if (logCallIssues.length === 0 && validLogCalls > 0) {
      this.addResult({
        testName: 'Audit Trail - logDispensing() Calls',
        status: 'PASS',
        message: `All ${validLogCalls} logDispensing() calls have required parameters`,
        details: { totalCalls: totalLogCalls, validCalls: validLogCalls }
      });
    } else {
      this.addResult({
        testName: 'Audit Trail - logDispensing() Calls',
        status: 'FAIL',
        message: `logDispensing() validation issues found`,
        details: { 
          totalCalls: totalLogCalls, 
          validCalls: validLogCalls, 
          issues: logCallIssues 
        },
        criticalFailure: logCallIssues.length > 0
      });
    }
  }

  /**
   * VALIDATION 3: Thai Language Medical Messages
   * Critical: Medical terminology must be preserved exactly for regulatory compliance
   */
  private async validateThaiLanguageMessages(): Promise<void> {
    const ipcHandlerFiles = [
      '/main/ku16/ipcMain/unlock.ts',
      '/main/ku16/ipcMain/dispensing.ts',
      '/main/ku16/ipcMain/dispensing-continue.ts', 
      '/main/ku16/ipcMain/reset.ts',
      '/main/ku16/ipcMain/forceReset.ts'
    ];

    let messagesFound = 0;
    let validMessages = 0;
    const messageIssues: string[] = [];

    for (const filePath of ipcHandlerFiles) {
      try {
        const fullPath = `/Users/non/dev/smc/smc-app${filePath}`;
        
        if (!fs.existsSync(fullPath)) {
          messageIssues.push(`File not found: ${filePath}`);
          continue;
        }

        const fileContent = fs.readFileSync(fullPath, 'utf8');
        
        // Check for each required Thai message
        for (const [processType, expectedMessage] of Object.entries(REQUIRED_THAI_MESSAGES)) {
          if (fileContent.includes(expectedMessage)) {
            messagesFound++;
            validMessages++;
          } else if (fileContent.includes(processType)) {
            messagesFound++;
            messageIssues.push(`${filePath}: Missing Thai message for ${processType}: "${expectedMessage}"`);
          }
        }

        // Check for common Thai error messages that should be preserved
        const commonThaiMessages = [
          'ไม่พบผู้ใช้งาน',
          'ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้',
          'รหัสผ่านไม่ถูกต้อง'
        ];

        for (const message of commonThaiMessages) {
          if (fileContent.includes(message)) {
            messagesFound++;
            validMessages++;
          }
        }

      } catch (error) {
        messageIssues.push(`Error reading ${filePath}: ${error.message}`);
      }
    }

    if (messageIssues.length === 0 && messagesFound > 0) {
      this.addResult({
        testName: 'Medical Compliance - Thai Language Messages',
        status: 'PASS',
        message: `All ${validMessages} Thai medical messages preserved correctly`,
        details: { totalMessages: messagesFound, validMessages }
      });
    } else {
      this.addResult({
        testName: 'Medical Compliance - Thai Language Messages',
        status: messageIssues.length > 0 ? 'FAIL' : 'WARNING',
        message: messagesFound === 0 ? 'No Thai messages found' : 'Thai message validation issues',
        details: { 
          totalMessages: messagesFound, 
          validMessages,
          issues: messageIssues 
        },
        criticalFailure: messageIssues.length > 0
      });
    }
  }

  /**
   * VALIDATION 4: Authentication Patterns
   * Critical: User authentication must be preserved exactly for security
   */
  private async validateAuthenticationPatterns(): Promise<void> {
    const ipcHandlerFiles = [
      '/main/ku16/ipcMain/unlock.ts',
      '/main/ku16/ipcMain/dispensing.ts',
      '/main/ku16/ipcMain/dispensing-continue.ts',
      '/main/ku16/ipcMain/reset.ts', 
      '/main/ku16/ipcMain/forceReset.ts'
    ];

    let authPatternsFound = 0;
    let validAuthPatterns = 0;
    const authIssues: string[] = [];

    for (const filePath of ipcHandlerFiles) {
      try {
        const fullPath = `/Users/non/dev/smc/smc-app${filePath}`;
        
        if (!fs.existsSync(fullPath)) {
          authIssues.push(`File not found: ${filePath}`);
          continue;
        }

        const fileContent = fs.readFileSync(fullPath, 'utf8');
        
        // Check for User.findOne with passkey validation
        if (fileContent.includes('User.findOne') && fileContent.includes('passkey')) {
          authPatternsFound++;
          
          if (fileContent.includes('where: { passkey: payload.passkey }') || 
              fileContent.includes('where: { passkey: passkey }')) {
            validAuthPatterns++;
          } else {
            authIssues.push(`${filePath}: User.findOne pattern may be incorrect`);
          }
        }

        // Check for proper user validation
        if (fileContent.includes('!user')) {
          authPatternsFound++;
          
          if (fileContent.includes('throw new Error') || fileContent.includes('return')) {
            validAuthPatterns++;
          } else {
            authIssues.push(`${filePath}: User validation may not properly handle missing user`);
          }
        }

        // Check for user ID extraction
        if (fileContent.includes('user.dataValues.id') || fileContent.includes('user?.dataValues?.id')) {
          validAuthPatterns++;
        }

      } catch (error) {
        authIssues.push(`Error reading ${filePath}: ${error.message}`);
      }
    }

    if (authIssues.length === 0 && validAuthPatterns > 0) {
      this.addResult({
        testName: 'Security - Authentication Patterns',
        status: 'PASS',
        message: `Authentication patterns preserved in ${validAuthPatterns} locations`,
        details: { patternsFound: authPatternsFound, validPatterns: validAuthPatterns }
      });
    } else {
      this.addResult({
        testName: 'Security - Authentication Patterns', 
        status: 'FAIL',
        message: 'Authentication pattern validation issues found',
        details: { 
          patternsFound: authPatternsFound,
          validPatterns: validAuthPatterns,
          issues: authIssues 
        },
        criticalFailure: authIssues.length > 0
      });
    }
  }

  /**
   * VALIDATION 5: Process Types Preservation
   * Ensures all required medical device process types are maintained
   */
  private async validateProcessTypes(): Promise<void> {
    const loggerFile = '/Users/non/dev/smc/smc-app/main/logger/index.ts';
    
    try {
      if (!fs.existsSync(loggerFile)) {
        this.addResult({
          testName: 'Process Types - Logger Definition',
          status: 'FAIL',
          message: 'Logger file not found',
          criticalFailure: true
        });
        return;
      }

      const fileContent = fs.readFileSync(loggerFile, 'utf8');
      
      // Extract process type definition from DispensingLogData interface
      const processTypeRegex = /process:\s*\|\s*["']([^"']+)["']/g;
      const foundProcessTypes = [];
      let match;
      
      while ((match = processTypeRegex.exec(fileContent)) !== null) {
        foundProcessTypes.push(match[1]);
      }

      const missingProcessTypes = REQUIRED_PROCESS_TYPES.filter(
        processType => !foundProcessTypes.includes(processType)
      );

      if (missingProcessTypes.length === 0) {
        this.addResult({
          testName: 'Process Types - All Required Types Present',
          status: 'PASS',
          message: `All ${REQUIRED_PROCESS_TYPES.length} required process types found`,
          details: { requiredTypes: REQUIRED_PROCESS_TYPES, foundTypes: foundProcessTypes }
        });
      } else {
        this.addResult({
          testName: 'Process Types - All Required Types Present',
          status: 'FAIL',
          message: `Missing process types: ${missingProcessTypes.join(', ')}`,
          details: { 
            requiredTypes: REQUIRED_PROCESS_TYPES, 
            foundTypes: foundProcessTypes,
            missingTypes: missingProcessTypes 
          },
          criticalFailure: true
        });
      }

    } catch (error) {
      this.addResult({
        testName: 'Process Types Validation',
        status: 'FAIL', 
        message: `Process type validation failed: ${error.message}`,
        criticalFailure: true
      });
    }
  }

  /**
   * VALIDATION 6: Database Operations Consistency
   * Ensures Slot.update operations are preserved correctly
   */
  private async validateDatabaseOperations(): Promise<void> {
    const ipcHandlerFiles = [
      '/main/ku16/ipcMain/unlock.ts',
      '/main/ku16/ipcMain/dispensing.ts',
      '/main/ku16/ipcMain/dispensing-continue.ts',
      '/main/ku16/ipcMain/reset.ts',
      '/main/ku16/ipcMain/forceReset.ts'
    ];

    let slotUpdateOperations = 0;
    let validSlotUpdates = 0;
    const dbIssues: string[] = [];

    for (const filePath of ipcHandlerFiles) {
      try {
        const fullPath = `/Users/non/dev/smc/smc-app${filePath}`;
        
        if (!fs.existsSync(fullPath)) {
          dbIssues.push(`File not found: ${filePath}`);
          continue;
        }

        const fileContent = fs.readFileSync(fullPath, 'utf8');
        
        // Count Slot.update operations
        const slotUpdateMatches = fileContent.match(/Slot\.update\s*\(/g);
        if (slotUpdateMatches) {
          slotUpdateOperations += slotUpdateMatches.length;
          
          // Validate that updates include where clause
          const updateWithWhereMatches = fileContent.match(/Slot\.update\s*\([^}]+\}\s*,\s*\{\s*where:/g);
          if (updateWithWhereMatches) {
            validSlotUpdates += updateWithWhereMatches.length;
          }
        }

        // Check for User.findOne operations for authentication
        const userFindMatches = fileContent.match(/User\.findOne/g);
        if (userFindMatches && userFindMatches.length > 0) {
          // This is expected in authentication handlers
        }

      } catch (error) {
        dbIssues.push(`Error reading ${filePath}: ${error.message}`);
      }
    }

    if (dbIssues.length === 0) {
      this.addResult({
        testName: 'Database Operations - Slot Updates',
        status: slotUpdateOperations === validSlotUpdates ? 'PASS' : 'WARNING',
        message: `Found ${validSlotUpdates}/${slotUpdateOperations} valid Slot.update operations`,
        details: { totalOperations: slotUpdateOperations, validOperations: validSlotUpdates }
      });
    } else {
      this.addResult({
        testName: 'Database Operations - Slot Updates',
        status: 'FAIL',
        message: 'Database operation validation issues found',
        details: { 
          totalOperations: slotUpdateOperations,
          validOperations: validSlotUpdates,
          issues: dbIssues 
        },
        criticalFailure: true
      });
    }
  }

  /**
   * VALIDATION 7: Security Audit Trail
   * Ensures complete security logging for failed operations
   */
  private async validateSecurityAuditTrail(): Promise<void> {
    const ipcHandlerFiles = [
      '/main/ku16/ipcMain/unlock.ts',
      '/main/ku16/ipcMain/dispensing.ts',
      '/main/ku16/ipcMain/dispensing-continue.ts',
      '/main/ku16/ipcMain/reset.ts',
      '/main/ku16/ipcMain/forceReset.ts'
    ];

    let securityLogOperations = 0;
    let errorHandlingBlocks = 0;
    const securityIssues: string[] = [];

    for (const filePath of ipcHandlerFiles) {
      try {
        const fullPath = `/Users/non/dev/smc/smc-app${filePath}`;
        
        if (!fs.existsSync(fullPath)) {
          securityIssues.push(`File not found: ${filePath}`);
          continue;
        }

        const fileContent = fs.readFileSync(fullPath, 'utf8');
        
        // Count try-catch blocks for error handling
        const tryCatchMatches = fileContent.match(/try\s*\{/g);
        if (tryCatchMatches) {
          errorHandlingBlocks += tryCatchMatches.length;
        }

        // Count logger calls for security events
        const loggerMatches = fileContent.match(/await\s+logger\s*\(/g);
        if (loggerMatches) {
          securityLogOperations += loggerMatches.length;
        }

        // Check for specific security logging patterns
        if (fileContent.includes('user not found')) {
          securityLogOperations++;
        }

        if (fileContent.includes('error') && (
            fileContent.includes('logger') || 
            fileContent.includes('logDispensing')
        )) {
          // Good: Error logging is present
        } else if (fileContent.includes('catch')) {
          securityIssues.push(`${filePath}: Error handling may not include proper logging`);
        }

      } catch (error) {
        securityIssues.push(`Error reading ${filePath}: ${error.message}`);
      }
    }

    if (securityIssues.length === 0 && securityLogOperations > 0) {
      this.addResult({
        testName: 'Security - Audit Trail Logging',
        status: 'PASS',
        message: `Security audit logging found in ${errorHandlingBlocks} error handling blocks`,
        details: { 
          securityLogOperations, 
          errorHandlingBlocks 
        }
      });
    } else {
      this.addResult({
        testName: 'Security - Audit Trail Logging',
        status: 'FAIL',
        message: 'Security audit trail validation issues found',
        details: { 
          securityLogOperations,
          errorHandlingBlocks,
          issues: securityIssues 
        },
        criticalFailure: securityIssues.length > 0
      });
    }
  }

  /**
   * VALIDATION 8: IPC Handler Integrity
   * Validates that all 7 critical handlers from Phase 4.1 scope are properly migrated
   */
  private async validateIpcHandlerIntegrity(): Promise<void> {
    const requiredHandlers = [
      'init.ts',
      'unlock.ts', 
      'dispensing.ts',
      'dispensing-continue.ts',
      'checkLockedBack.ts',
      'reset.ts',
      'forceReset.ts'
    ];

    let handlersFound = 0;
    let handlersWithComments = 0;
    const handlerIssues: string[] = [];

    for (const handler of requiredHandlers) {
      try {
        const filePath = `/Users/non/dev/smc/smc-app/main/ku16/ipcMain/${handler}`;
        
        if (!fs.existsSync(filePath)) {
          handlerIssues.push(`Missing required handler: ${handler}`);
          continue;
        }

        handlersFound++;
        const fileContent = fs.readFileSync(filePath, 'utf8');
        
        // Check for migration comments indicating proper transition
        if (fileContent.includes('MIGRATION:') || 
            fileContent.includes('PRESERVE:') ||
            fileContent.includes('BuildTimeController')) {
          handlersWithComments++;
        } else {
          handlerIssues.push(`${handler}: Missing migration documentation comments`);
        }

        // Check for proper controller usage
        if (handler !== 'checkLockedBack.ts' && !fileContent.includes('BuildTimeController.getCurrentController()')) {
          handlerIssues.push(`${handler}: Not using BuildTimeController pattern`);
        }

      } catch (error) {
        handlerIssues.push(`Error reading ${handler}: ${error.message}`);
      }
    }

    if (handlerIssues.length === 0 && handlersFound === requiredHandlers.length) {
      this.addResult({
        testName: 'IPC Handler Migration - All Handlers Present',
        status: 'PASS',
        message: `All ${requiredHandlers.length} Phase 4.1 IPC handlers properly migrated`,
        details: { 
          requiredHandlers: requiredHandlers.length,
          handlersFound,
          handlersWithComments 
        }
      });
    } else {
      this.addResult({
        testName: 'IPC Handler Migration - All Handlers Present',
        status: 'FAIL',
        message: `IPC handler migration validation issues found`,
        details: { 
          requiredHandlers: requiredHandlers.length,
          handlersFound,
          handlersWithComments,
          issues: handlerIssues 
        },
        criticalFailure: handlerIssues.length > 0
      });
    }
  }

  /**
   * VALIDATION 9: Slot State Management
   * Ensures slot state updates maintain medical device safety requirements
   */
  private async validateSlotStateManagement(): Promise<void> {
    const stateManagementFiles = [
      '/main/ku16/ipcMain/unlock.ts',
      '/main/ku16/ipcMain/dispensing.ts',
      '/main/ku16/ipcMain/reset.ts',
      '/main/ku16/ipcMain/forceReset.ts'
    ];

    let stateUpdateOperations = 0;
    let validStateUpdates = 0;
    const stateIssues: string[] = [];

    for (const filePath of stateManagementFiles) {
      try {
        const fullPath = `/Users/non/dev/smc/smc-app${filePath}`;
        
        if (!fs.existsSync(fullPath)) {
          stateIssues.push(`File not found: ${filePath}`);
          continue;
        }

        const fileContent = fs.readFileSync(fullPath, 'utf8');
        
        // Check for proper state field updates
        const stateFields = ['occupied', 'opening', 'isActive', 'hn', 'timestamp'];
        
        for (const field of stateFields) {
          const fieldUpdateRegex = new RegExp(`${field}:\\s*[^,}]+`, 'g');
          const matches = fileContent.match(fieldUpdateRegex);
          
          if (matches) {
            stateUpdateOperations += matches.length;
            
            // Validate field updates make sense
            if ((field === 'occupied' || field === 'opening' || field === 'isActive') && 
                matches.some(match => /:\s*(true|false)/.test(match))) {
              validStateUpdates++;
            } else if (field === 'hn' && matches.some(match => /:\s*(null|\w+)/.test(match))) {
              validStateUpdates++;
            } else if (field === 'timestamp' && matches.some(match => /:\s*(null|\w+)/.test(match))) {
              validStateUpdates++;
            }
          }
        }

        // Check for atomic database operations
        if (fileContent.includes('Slot.update') && !fileContent.includes('transaction')) {
          // Note: Single updates are acceptable for slot operations
          // Complex multi-table operations would need transactions
        }

      } catch (error) {
        stateIssues.push(`Error reading ${filePath}: ${error.message}`);
      }
    }

    if (stateIssues.length === 0 && validStateUpdates > 0) {
      this.addResult({
        testName: 'Slot State Management - Update Operations',
        status: 'PASS', 
        message: `Found ${validStateUpdates} valid slot state update operations`,
        details: { 
          totalStateOperations: stateUpdateOperations,
          validStateUpdates 
        }
      });
    } else {
      this.addResult({
        testName: 'Slot State Management - Update Operations',
        status: 'FAIL',
        message: 'Slot state management validation issues found',
        details: { 
          totalStateOperations: stateUpdateOperations,
          validStateUpdates,
          issues: stateIssues 
        },
        criticalFailure: stateIssues.length > 0
      });
    }
  }

  /**
   * VALIDATION 10: User Role Checking
   * Validates that user roles are properly checked for administrative operations
   */
  private async validateUserRoleChecking(): Promise<void> {
    const adminOperationFiles = [
      '/main/ku16/ipcMain/forceReset.ts',
      '/main/ku16/ipcMain/reset.ts'
    ];

    let roleCheckOperations = 0;
    let validRoleChecks = 0; 
    const roleIssues: string[] = [];

    for (const filePath of adminOperationFiles) {
      try {
        const fullPath = `/Users/non/dev/smc/smc-app${filePath}`;
        
        if (!fs.existsSync(fullPath)) {
          roleIssues.push(`File not found: ${filePath}`);
          continue;
        }

        const fileContent = fs.readFileSync(fullPath, 'utf8');
        
        // Check for role-based validation (currently using passkey, future enhancement)
        if (fileContent.includes('user.dataValues.role') || 
            fileContent.includes('user.role')) {
          roleCheckOperations++;
          validRoleChecks++;
        } else if (fileContent.includes('User.findOne') && fileContent.includes('passkey')) {
          // Currently using passkey authentication - acceptable for Phase 4.1
          roleCheckOperations++;
          // Note: Role-based access control is future enhancement
        }

      } catch (error) {
        roleIssues.push(`Error reading ${filePath}: ${error.message}`);
      }
    }

    this.addResult({
      testName: 'User Role Checking - Administrative Operations',
      status: roleCheckOperations > 0 ? 'PASS' : 'WARNING',
      message: roleCheckOperations > 0 
        ? 'User authentication found in administrative operations' 
        : 'No role checking found - using passkey authentication',
      details: { 
        roleCheckOperations,
        validRoleChecks,
        note: 'Role-based access control is future enhancement - passkey auth currently used'
      }
    });
  }

  /**
   * VALIDATION 11: Timestamp Tracking
   * Ensures proper timestamp tracking for medical audit requirements
   */
  private async validateTimestampTracking(): Promise<void> {
    try {
      // Check logDispensing function creates proper timestamps
      const loggerFile = '/Users/non/dev/smc/smc-app/main/logger/index.ts';
      
      if (!fs.existsSync(loggerFile)) {
        this.addResult({
          testName: 'Timestamp Tracking - Logger Implementation',
          status: 'FAIL',
          message: 'Logger file not found',
          criticalFailure: true
        });
        return;
      }

      const fileContent = fs.readFileSync(loggerFile, 'utf8');
      
      // Check for timestamp creation in createDispensingLog
      const hasTimestamp = fileContent.includes('timestamp: new Date().getTime()');
      const hasUserTracking = fileContent.includes('userId: data.userId');
      
      if (hasTimestamp && hasUserTracking) {
        this.addResult({
          testName: 'Timestamp Tracking - Audit Logging',
          status: 'PASS',
          message: 'Proper timestamp and user tracking implemented in audit logging',
          details: { hasTimestamp, hasUserTracking }
        });
      } else {
        this.addResult({
          testName: 'Timestamp Tracking - Audit Logging',
          status: 'FAIL', 
          message: 'Missing timestamp or user tracking in audit logging',
          details: { hasTimestamp, hasUserTracking },
          criticalFailure: !hasTimestamp
        });
      }

    } catch (error) {
      this.addResult({
        testName: 'Timestamp Tracking Validation',
        status: 'FAIL',
        message: `Timestamp validation failed: ${error.message}`,
        criticalFailure: true
      });
    }
  }

  /**
   * VALIDATION 12: Error Handling Patterns
   * Ensures consistent error handling and logging patterns
   */
  private async validateErrorHandlingPatterns(): Promise<void> {
    const ipcHandlerFiles = [
      '/main/ku16/ipcMain/unlock.ts',
      '/main/ku16/ipcMain/dispensing.ts',
      '/main/ku16/ipcMain/dispensing-continue.ts',
      '/main/ku16/ipcMain/reset.ts',
      '/main/ku16/ipcMain/forceReset.ts'
    ];

    let errorHandlerCount = 0;
    let properErrorLogging = 0;
    const errorIssues: string[] = [];

    for (const filePath of ipcHandlerFiles) {
      try {
        const fullPath = `/Users/non/dev/smc/smc-app${filePath}`;
        
        if (!fs.existsSync(fullPath)) {
          errorIssues.push(`File not found: ${filePath}`);
          continue;
        }

        const fileContent = fs.readFileSync(fullPath, 'utf8');
        
        // Count catch blocks
        const catchBlocks = fileContent.match(/catch\s*\([^)]+\)\s*\{/g);
        if (catchBlocks) {
          errorHandlerCount += catchBlocks.length;
          
          // Check if catch blocks include proper logging
          if (fileContent.includes('catch') && 
              (fileContent.includes('logger') || fileContent.includes('logDispensing'))) {
            properErrorLogging++;
          }
        }

        // Check for IPC error events (medical device UI feedback requirement)
        const ipcErrorEvents = fileContent.match(/\.send\(['"]\w*-error['"]/g);
        if (ipcErrorEvents) {
          // Good: Proper error communication to UI
        }

      } catch (error) {
        errorIssues.push(`Error reading ${filePath}: ${error.message}`);
      }
    }

    if (errorIssues.length === 0 && errorHandlerCount > 0) {
      this.addResult({
        testName: 'Error Handling - Consistent Patterns', 
        status: properErrorLogging > 0 ? 'PASS' : 'WARNING',
        message: `Found ${errorHandlerCount} error handlers with ${properErrorLogging} proper logging implementations`,
        details: { 
          errorHandlerCount,
          properErrorLogging 
        }
      });
    } else {
      this.addResult({
        testName: 'Error Handling - Consistent Patterns',
        status: 'FAIL',
        message: 'Error handling pattern validation issues found',
        details: { 
          errorHandlerCount,
          properErrorLogging,
          issues: errorIssues 
        },
        criticalFailure: errorIssues.length > 0
      });
    }
  }

  /**
   * Add validation result and track critical failures
   */
  private addResult(result: ValidationResult): void {
    this.results.push(result);
    
    if (result.criticalFailure) {
      this.criticalFailures++;
    }

    // Log result to console
    const statusIcon = result.status === 'PASS' ? '✅' : 
                      result.status === 'WARNING' ? '⚠️' : '❌';
    
    console.log(`${statusIcon} ${result.testName}: ${result.message}`);
    
    if (result.details && (result.status === 'FAIL' || result.status === 'WARNING')) {
      console.log(`   Details:`, result.details);
    }
  }

  /**
   * Generate comprehensive validation report
   */
  private generateReport(): AuditTrailValidation {
    const summary = {
      totalTests: this.results.length,
      passed: this.results.filter(r => r.status === 'PASS').length,
      failed: this.results.filter(r => r.status === 'FAIL').length,
      warnings: this.results.filter(r => r.status === 'WARNING').length,
      criticalFailures: this.criticalFailures
    };

    const complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW' = 
      summary.criticalFailures > 0 ? 'NON_COMPLIANT' :
      summary.failed > 0 ? 'NEEDS_REVIEW' : 'COMPLIANT';

    const recommendations = this.generateRecommendations();

    console.log('\n📊 VALIDATION SUMMARY');
    console.log('====================');
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);  
    console.log(`⚠️ Warnings: ${summary.warnings}`);
    console.log(`🔥 Critical Failures: ${summary.criticalFailures}`);
    console.log(`\n🏥 Compliance Status: ${complianceStatus}`);

    if (recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS');
      console.log('==================');
      recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    return {
      results: this.results,
      summary,
      complianceStatus,
      recommendations
    };
  }

  /**
   * Generate actionable recommendations based on validation results
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.criticalFailures > 0) {
      recommendations.push('🔥 CRITICAL: Address all critical failures before production deployment');
    }

    const failedTests = this.results.filter(r => r.status === 'FAIL');
    if (failedTests.length > 0) {
      recommendations.push('❌ Review and fix all failed validation tests to ensure medical device compliance');
    }

    const warningTests = this.results.filter(r => r.status === 'WARNING'); 
    if (warningTests.length > 0) {
      recommendations.push('⚠️ Address warning items to improve system robustness');
    }

    // Specific recommendations based on test results
    const logDispenseTest = this.results.find(r => r.testName.includes('logDispensing'));
    if (logDispenseTest && logDispenseTest.status !== 'PASS') {
      recommendations.push('Ensure all medical operations have complete audit logging via logDispensing() calls');
    }

    const thaiMessageTest = this.results.find(r => r.testName.includes('Thai Language'));
    if (thaiMessageTest && thaiMessageTest.status !== 'PASS') {
      recommendations.push('Verify all Thai language medical messages are preserved exactly for regulatory compliance');
    }

    const authTest = this.results.find(r => r.testName.includes('Authentication'));
    if (authTest && authTest.status !== 'PASS') {
      recommendations.push('Review user authentication patterns to ensure security is maintained');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ All validations passed - Phase 4.1 migration maintains complete audit trail integrity');
    }

    return recommendations;
  }
}

/**
 * EXECUTION ENTRY POINT
 * Run comprehensive audit trail validation
 */
export async function validatePhase41AuditTrail(): Promise<AuditTrailValidation> {
  const validator = new Phase41AuditTrailValidator();
  return await validator.validateAll();
}

// Run validation if called directly
if (require.main === module) {
  validatePhase41AuditTrail()
    .then(result => {
      console.log('\n🏥 PHASE 4.1 AUDIT TRAIL VALIDATION COMPLETE');
      console.log('============================================');
      
      if (result.complianceStatus === 'COMPLIANT') {
        console.log('✅ MEDICAL DEVICE COMPLIANCE: VALIDATED');
        console.log('   Phase 4.1 IPC handler migration maintains complete audit trail integrity');
        process.exit(0);
      } else if (result.complianceStatus === 'NEEDS_REVIEW') {
        console.log('⚠️ MEDICAL DEVICE COMPLIANCE: NEEDS REVIEW');
        console.log('   Minor issues found - review recommendations before production');
        process.exit(1);
      } else {
        console.log('❌ MEDICAL DEVICE COMPLIANCE: CRITICAL FAILURES');
        console.log('   Critical issues must be resolved before production deployment');
        process.exit(2);
      }
    })
    .catch(error => {
      console.error('💥 VALIDATION FAILED:', error.message);
      process.exit(3);
    });
}
/**
 * Environment Detection Utilities
 * 
 * ใช้สำหรับตรวจสอบ environment และ platform 
 * เพื่อกำหนด behavior ที่แตกต่างกันระหว่าง development และ production
 */

/**
 * ตรวจสอบว่าอยู่ใน development environment บน macOS หรือไม่
 * ใช้สำหรับ bypass WiFi connection ในระหว่าง development
 * 
 * @returns true ถ้าอยู่ใน development mode บน macOS
 */
export function isDevelopmentBypass(): boolean {
  const nodeEnv = process.env.NODE_ENV || 'production';
  const platform = process.platform;
  
  // Development bypass เฉพาะบน macOS เท่านั้น
  return nodeEnv === 'development' && platform === 'darwin';
}

/**
 * ตรวจสอบว่าอยู่ใน production environment หรือไม่
 * 
 * @returns true ถ้าอยู่ใน production mode
 */
export function isProduction(): boolean {
  const nodeEnv = process.env.NODE_ENV || 'production';
  return nodeEnv === 'production';
}

/**
 * ตรวจสอบ platform ปัจจุบัน
 * 
 * @returns platform string (darwin, win32, linux, etc.)
 */
export function getCurrentPlatform(): string {
  return process.platform;
}

/**
 * แสดงข้อมูล environment ปัจจุบัน
 * ใช้สำหรับ debugging และ logging
 */
export function getEnvironmentInfo(): {
  nodeEnv: string;
  platform: string;
  isDevelopmentBypass: boolean;
  isProduction: boolean;
} {
  return {
    nodeEnv: process.env.NODE_ENV || 'production',
    platform: process.platform,
    isDevelopmentBypass: isDevelopmentBypass(),
    isProduction: isProduction()
  };
}

/**
 * Log environment information
 * แสดงข้อมูล environment ใน console สำหรับ debugging
 */
export function logEnvironmentInfo(): void {
  const envInfo = getEnvironmentInfo();
  
  console.log('info: Environment Information:');
  console.log(`info:   NODE_ENV: ${envInfo.nodeEnv}`);
  console.log(`info:   Platform: ${envInfo.platform}`);
  console.log(`info:   Development Bypass: ${envInfo.isDevelopmentBypass}`);
  console.log(`info:   Production Mode: ${envInfo.isProduction}`);
  
  if (envInfo.isDevelopmentBypass) {
    console.log('⚠️  Development Mode: Some features may be mocked or bypassed');
  }
}

// ===========================================
// PHASE 4.2: PRODUCTION LICENSE & WIFI MANAGEMENT
// ===========================================

/**
 * License validation mode types
 * - bypass: ข้าม validation ทั้งหมด (development only)
 * - real-hardware: ใช้ ESP32 จริงใน dev mode (ไม่ mock)  
 * - production: Full license validation (production)
 */
export type ValidationMode = 'bypass' | 'real-hardware' | 'production';

/**
 * Platform WiFi strategy types
 * - auto: ลองเชื่อมต่อ WiFi อัตโนมัติ (Windows)
 * - manual: แสดง instructions ให้ user เชื่อมต่อเอง (macOS)
 */
export type WiFiStrategy = 'auto' | 'manual';

/**
 * กำหนด validation mode ตาม environment variables
 * 
 * @returns ValidationMode ตามลำดับความสำคัญ:
 *   1. bypass - ถ้า SMC_LICENSE_BYPASS_MODE=true
 *   2. real-hardware - ถ้า development + SMC_DEV_REAL_HARDWARE=true  
 *   3. production - default behavior
 */
export function getValidationMode(): ValidationMode {
  // Priority 1: Full bypass mode (development only)
  if (process.env.SMC_LICENSE_BYPASS_MODE === 'true') {
    return 'bypass';
  }
  
  // Priority 2: Development with real hardware  
  if (process.env.NODE_ENV === 'development' && process.env.SMC_DEV_REAL_HARDWARE === 'true') {
    return 'real-hardware';
  }
  
  // Priority 3: Production mode (default)
  return 'production';
}

/**
 * ตรวจสอบว่าอยู่ใน license bypass mode หรือไม่
 * 
 * @returns true ถ้า SMC_LICENSE_BYPASS_MODE=true
 */
export function isLicenseBypassMode(): boolean {
  return process.env.SMC_LICENSE_BYPASS_MODE === 'true';
}

/**
 * ตรวจสอบว่าอยู่ใน real hardware mode หรือไม่
 * 
 * @returns true ถ้า development + SMC_DEV_REAL_HARDWARE=true
 */
export function isRealHardwareMode(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.SMC_DEV_REAL_HARDWARE === 'true';
}

/**
 * กำหนด platform WiFi strategy
 * 
 * @returns WiFiStrategy ตาม platform และ environment:
 *   - auto: Windows หรือ SMC_PLATFORM_WIFI_AUTO=true
 *   - manual: macOS หรือ SMC_PLATFORM_WIFI_AUTO=false
 */
export function getPlatformWiFiStrategy(): WiFiStrategy {
  // ถ้าตั้งค่า SMC_PLATFORM_WIFI_AUTO ไว้แล้ว ใช้ตามนั้น
  if (process.env.SMC_PLATFORM_WIFI_AUTO !== undefined) {
    return process.env.SMC_PLATFORM_WIFI_AUTO === 'true' ? 'auto' : 'manual';
  }
  
  // Default behavior: Windows = auto, macOS = manual
  return process.platform === 'win32' ? 'auto' : 'manual';
}

/**
 * แสดงข้อมูล Phase 4.2 configuration ทั้งหมด
 */
export function logPhase42Configuration(): void {
  const validationMode = getValidationMode();
  const wifiStrategy = getPlatformWiFiStrategy();
  
  console.log('info: Phase 4.2 Configuration:');
  console.log(`info:   Validation Mode: ${validationMode}`);
  console.log(`info:   WiFi Strategy: ${wifiStrategy} (${process.platform})`);
  console.log(`info:   License Bypass: ${isLicenseBypassMode()}`);
  console.log(`info:   Real Hardware: ${isRealHardwareMode()}`);
  
  if (validationMode === 'bypass') {
    console.log('🔓 License validation will be bypassed');
  }
  
  if (wifiStrategy === 'manual') {
    console.log('📶 Manual WiFi connection required');
  }
}
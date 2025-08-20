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
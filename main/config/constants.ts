// Application constants and configuration
// These values are hardcoded at build time for security

// APP_SERIAL for license validation - must match the app_serial in JWT token
// This is the actual app_serial from the license: 1ea89fc32721ff692ff70d36868406b7d673c9df1200b6be7313f053f58de8c3
export const APP_SERIAL =
  "1ea89fc32721ff692ff70d36868406b7d673c9df1200b6be7313f053f58de8c3";

// HTTP client configuration for ESP32 communication
export const ESP32_CONFIG = {
  HTTP_TIMEOUT: 10000, // 10 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // 2 seconds between retries
} as const;

// License validation configuration
export const LICENSE_CONFIG = {
  JWT_SECRET_KEY:
    "38716e276a065195302edd7d5f42b599af527378f68b1cbb02bbe93cda8b25b4d4be34df9ad7592b0833f6501644dcb2f8617a3610eaabb9f9b4aeb5a1c11b42",
  // Enable test mode to skip JWT signature verification during development
  // Set to false for production when correct secret key is available
  TEST_MODE: true,
} as const;

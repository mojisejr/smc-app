import axios, { AxiosError } from "axios";
import chalk from "chalk";
import { ESP32MacResponse, ESP32Config, CLIError } from "../types";

/**
 * ESP32 Communication Module
 *
 * ใช้สำหรับการเชื่อมต่อกับ ESP32 device ผ่าน HTTP API
 * เพื่อดึง MAC address สำหรับ license binding
 */

// Default configuration สำหรับ ESP32 connection
const DEFAULT_ESP32_CONFIG: ESP32Config = {
  ip: "192.168.4.1", // IP ที่ user setup ไว้
  port: 80, // HTTP port
  timeout: 10000, // 10 seconds timeout
  max_retries: 3, // retry 3 ครั้งถ้าเชื่อมต่อไม่ได้
};

/**
 * ตรวจสอบว่า IP address ถูกต้องหรือไม่
 */
function validateIPAddress(ip: string): boolean {
  const ipRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
}

/**
 * ตรวจสอบว่า MAC address format ถูกต้องหรือไม่
 */
function validateMACAddress(mac: string): boolean {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
}

/**
 * เชื่อมต่อไปยัง ESP32 และดึง MAC address
 *
 * @param ip - ESP32 IP address
 * @param config - Optional configuration override
 * @returns Promise<ESP32MacResponse>
 */
export async function getESP32MacAddress(
  ip: string = DEFAULT_ESP32_CONFIG.ip,
  config?: Partial<ESP32Config>
): Promise<ESP32MacResponse> {
  // Merge configuration
  const esp32Config = { ...DEFAULT_ESP32_CONFIG, ...config, ip };

  // Validate IP address format
  if (!validateIPAddress(ip)) {
    throw new Error(`Invalid IP address format: ${ip}`);
  }

  console.log(
    chalk.blue(`🔌 Connecting to ESP32 at ${ip}:${esp32Config.port}...`)
  );
  
  // แสดง progress indicator
  const progressChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let progressIndex = 0;
  let progressInterval: NodeJS.Timeout | null = null;
  
  const startProgress = (message: string) => {
    process.stdout.write(`   ${message} `);
    progressInterval = setInterval(() => {
      process.stdout.write(`\r   ${message} ${chalk.cyan(progressChars[progressIndex])}`);
      progressIndex = (progressIndex + 1) % progressChars.length;
    }, 100);
  };
  
  const stopProgress = (success: boolean, message: string) => {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    const icon = success ? chalk.green('✅') : chalk.red('❌');
    process.stdout.write(`\r   ${icon} ${message}\n`);
  };

  let lastError: any = null;

  // Retry loop
  for (let attempt = 1; attempt <= esp32Config.max_retries; attempt++) {
    try {
      console.log(
        chalk.gray(`   Attempt ${attempt}/${esp32Config.max_retries}`)
      );
      
      startProgress('Establishing connection...');

      // HTTP GET request ไปยัง /mac endpoint
      const response = await axios.get(`http://${ip}:${esp32Config.port}/mac`, {
        timeout: esp32Config.timeout,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "SMC-License-CLI/1.0.0",
        },
        validateStatus: (status) => status < 500, // Accept 4xx as valid response
      });

      stopProgress(true, `Connected successfully (${response.status})`);

      // ตรวจสอบ response structure
      if (!response.data) {
        throw new Error("Empty response from ESP32");
      }

      // Parse response data
      let macData: any;
      if (typeof response.data === "string") {
        try {
          macData = JSON.parse(response.data);
        } catch {
          // ถ้าไม่ใช่ JSON อาจจะเป็น plain text MAC address
          macData = { mac: response.data.trim() };
        }
      } else {
        macData = response.data;
      }

      // Validate MAC address ใน response
      const macAddress =
        macData.mac || macData.MAC || macData.macAddress || macData.mac_address;
      if (!macAddress) {
        throw new Error("MAC address not found in ESP32 response");
      }

      if (!validateMACAddress(macAddress)) {
        console.log(
          chalk.yellow(
            `⚠️  Warning: MAC address format may be invalid: ${macAddress}`
          )
        );
      }

      // สร้าง response object
      const esp32Response: ESP32MacResponse = {
        mac: macAddress,
        status: "success",
        timestamp: Date.now(),
        device_info: {
          ip: ip,
          firmware_version: macData.firmware_version || macData.version,
        },
      };

      console.log(chalk.green(`   📱 MAC Address: ${macAddress}`));
      if (esp32Response.device_info?.firmware_version) {
        console.log(
          chalk.gray(
            `   🔧 Firmware: ${esp32Response.device_info.firmware_version}`
          )
        );
      }

      return esp32Response;
    } catch (error: any) {
      lastError = error;
      
      // Stop progress indicator
      if (progressInterval) {
        clearInterval(progressInterval);
      }

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (axiosError.code === "ECONNREFUSED") {
          stopProgress(false, 'Connection refused - ESP32 may be offline');
        } else if (axiosError.code === "ETIMEDOUT") {
          stopProgress(false, `Connection timeout after ${esp32Config.timeout}ms`);
        } else if (axiosError.response) {
          stopProgress(false, `HTTP Error: ${axiosError.response.status} - ${axiosError.response.statusText}`);
        } else {
          stopProgress(false, `Network error: ${axiosError.message}`);
        }
      } else {
        stopProgress(false, `Error: ${error.message}`);
      }

      // รอสักครู่ก่อน retry (ยกเว้น attempt สุดท้าย)
      if (attempt < esp32Config.max_retries) {
        const waitTime = attempt * 1000; // เพิ่มเวลารอทุก attempt
        console.log(chalk.gray(`   ⏳ Waiting ${waitTime}ms before retry...`));
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  // ถ้า retry หมดแล้วยังไม่สำเร็จ
  console.log(
    chalk.red(
      `❌ Failed to connect to ESP32 after ${esp32Config.max_retries} attempts`
    )
  );

  // สร้าง error response
  throw new Error(
    `ESP32 connection failed: ${lastError?.message || "Unknown error"}`
  );
}

/**
 * ทดสอบการเชื่อมต่อไปยัง ESP32 (ping test)
 *
 * @param ip - ESP32 IP address
 * @param config - Optional configuration
 * @returns Promise<boolean>
 */
export async function testESP32Connection(
  ip: string = DEFAULT_ESP32_CONFIG.ip,
  config?: Partial<ESP32Config>
): Promise<boolean> {
  try {
    const response = await getESP32MacAddress(ip, config);
    return response.status === "success";
  } catch (error) {
    return false;
  }
}

/**
 * แสดงข้อมูลการเชื่อมต่อ ESP32 ในรูปแบบที่อ่านง่าย
 */
export async function displayESP32Info(
  ip: string = DEFAULT_ESP32_CONFIG.ip
): Promise<void> {
  console.log(chalk.blue("\n📡 ESP32 Connection Information:"));
  console.log(chalk.gray(`   Target IP: ${ip}`));
  console.log(chalk.gray(`   Endpoint: http://${ip}/mac`));
  console.log(chalk.gray(`   Timeout: ${DEFAULT_ESP32_CONFIG.timeout}ms`));
  console.log(
    chalk.gray(`   Max Retries: ${DEFAULT_ESP32_CONFIG.max_retries}`)
  );

  try {
    const startTime = Date.now();
    const response = await getESP32MacAddress(ip);
    const endTime = Date.now();

    console.log(chalk.green("\n✅ Connection Test Result:"));
    console.log(chalk.white(`   Status: ${response.status}`));
    console.log(chalk.white(`   MAC Address: ${response.mac}`));
    console.log(chalk.white(`   Response Time: ${endTime - startTime}ms`));

    if (response.device_info?.firmware_version) {
      console.log(
        chalk.white(`   Firmware: ${response.device_info.firmware_version}`)
      );
    }
  } catch (error: any) {
    console.log(chalk.red("\n❌ Connection Test Failed:"));
    console.log(chalk.red(`   Error: ${error.message}`));

    // Troubleshooting suggestions
    console.log(chalk.yellow("\n🔧 Troubleshooting:"));
    console.log(
      chalk.gray("   1. Check ESP32 is powered on and connected to WiFi")
    );
    console.log(chalk.gray(`   2. Verify ESP32 IP address is ${ip}`));
    console.log(
      chalk.gray("   3. Ensure /mac endpoint is implemented on ESP32")
    );
    console.log(chalk.gray("   4. Check firewall settings"));
  }
}

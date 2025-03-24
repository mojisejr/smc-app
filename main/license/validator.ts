import { createHash } from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Setting } from "../../db/model/setting.model";

// 🔹 ฟังก์ชันสร้าง HWID (อิงจาก MAC Address และ Hostname)
export function getHardwareId(): string {
  const macAddress =
    os.networkInterfaces()?.["eth0"]?.[0]?.mac || "00:00:00:00:00:00";
  const hostname = os.hostname();
  return createHash("sha256")
    .update(macAddress + hostname)
    .digest("hex");
}

// 🔹 ฟังก์ชันถอดรหัส License Key
export function decryptLicense(licenseKey: string) {
  try {
    const decoded = Buffer.from(licenseKey, "base64").toString();
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

// 🔹 ฟังก์ชันโหลด License Key จากไฟล์
export async function loadLicense(): Promise<string | null> {
  //   const licensePath = path.join(os.homedir(), ".myapp_license");
  const response = await Setting.findOne({ where: { id: 1 } });
  const licensePath = response.dataValues.activated_key;
  return licensePath;
}

// 🔹 ฟังก์ชันตรวจสอบ License Key
export async function validateLicense(): Promise<boolean> {
  const licenseKey = await loadLicense();
  if (!licenseKey) return false;

  const licenseData = decryptLicense(licenseKey);
  if (!licenseData) return false;

  const currentHWID = getHardwareId();
  if (licenseData.hwid !== currentHWID) return false; // HWID ไม่ตรง

  if (new Date(licenseData.expiry) < new Date()) return false; // License หมดอายุ

  const response = await Setting.findOne({ where: { id: 1 } });
  const organization = response.dataValues.organization;
  const customerName = response.dataValues.customer_name;

  if (licenseData.customerName !== organization) return false;
  if (licenseData.organization !== customerName) return false;

  return true;
}

// 🔹 ฟังก์ชันติดตั้ง License Key (สำหรับผู้ใช้)
export async function activateLicense(licenseKey: string): Promise<boolean> {
  const licenseData = decryptLicense(licenseKey);

  if (!licenseData) return false;

  const setting = await Setting.findOne({ where: { id: 1 } });

  const organization = setting.dataValues.organization;
  const customer_name = setting.dataValues.customer_name;

  if (licenseData.hwid !== getHardwareId()) return false; // ป้องกันการใช้ Key กับเครื่องอื่น

  if (customer_name !== licenseData.organization) return false;
  if (organization !== licenseData.customerName) return false;

  //save license key to database

  const result = await saveLicense(licenseKey);
  return result;
}

async function saveLicense(licenseKey: string) {
  try {
    const result = await Setting.update(
      {
        activated_key: licenseKey,
      },
      { where: { id: 1 } }
    );

    if (result.length < 0) return false;
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

import * as fs from "fs/promises";
import * as path from "path";
import chalk from "chalk";
import { getLicenseFileBasicInfo } from "./encryption";

/**
 * License Registry System
 *
 * จัดการ daily CSV registry สำหรับ license tracking
 * รองรับ workflow เดียวกันกับ ESP32 deployment tool
 */

export interface RegistryEntry {
  timestamp: string;
  customer_id: string;
  organization: string;
  application_name: string;
  expiry_date: string;
  license_status: "generated" | "active" | "expired" | "updated";
  license_type: "production" | "internal" | "development";
  license_file: string;
  mac_address: string;
  wifi_ssid: string;
  created_at: string;
  updated_at: string;
  notes: string;
}

export interface RegistryOptions {
  registryDir?: string;
  verbose?: boolean;
}

export class LicenseRegistry {
  private registryDir: string;
  private verbose: boolean;

  constructor(options: RegistryOptions = {}) {
    this.registryDir = options.registryDir || "./registry";
    this.verbose = options.verbose || false;
  }

  /**
   * สร้าง registry directory ถ้ายังไม่มี
   */
  async ensureRegistryDir(): Promise<void> {
    try {
      await fs.access(this.registryDir);
    } catch {
      await fs.mkdir(this.registryDir, { recursive: true });
      if (this.verbose) {
        console.log(
          chalk.cyan(`info: Created registry directory: ${this.registryDir}`)
        );
      }
    }
  }

  /**
   * สร้างชื่อไฟล์ registry ตามวันที่
   */
  getRegistryFileName(date?: Date): string {
    const targetDate = date || new Date();
    const dateStr = targetDate.toISOString().split("T")[0];
    return `license-registry-${dateStr}.csv`;
  }

  /**
   * สร้าง full path สำหรับ registry file
   */
  getRegistryFilePath(date?: Date): string {
    return path.join(this.registryDir, this.getRegistryFileName(date));
  }

  /**
   * สร้าง CSV header
   */
  getCSVHeader(): string {
    return "timestamp,customer_id,organization,application_name,expiry_date,license_status,license_type,license_file,mac_address,wifi_ssid,created_at,updated_at,notes";
  }

  /**
   * แปลง RegistryEntry เป็น CSV row
   */
  entryToCSVRow(entry: RegistryEntry): string {
    const fields = [
      entry.timestamp,
      entry.customer_id,
      entry.organization,
      entry.application_name,
      entry.expiry_date,
      entry.license_status,
      entry.license_type,
      entry.license_file,
      entry.mac_address,
      entry.wifi_ssid,
      entry.created_at,
      entry.updated_at,
      entry.notes,
    ];

    // Escape fields ที่มี comma หรือ quotes
    const escapedFields = fields.map((field) => {
      if (field.includes(",") || field.includes('"') || field.includes("\n")) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    });

    return escapedFields.join(",");
  }

  /**
   * อ่าน existing registry หรือสร้างใหม่
   */
  async readOrCreateRegistry(date?: Date): Promise<RegistryEntry[]> {
    await this.ensureRegistryDir();

    const filePath = this.getRegistryFilePath(date);

    try {
      const content = await fs.readFile(filePath, "utf8");
      const lines = content.trim().split("\n");

      if (lines.length <= 1) {
        return []; // Empty หรือมีแค่ header
      }

      // Parse CSV (simplified - สำหรับ production ควรใช้ proper CSV parser)
      const entries: RegistryEntry[] = [];
      for (let i = 1; i < lines.length; i++) {
        const fields = lines[i].split(",");
        if (fields.length >= 13) {
          entries.push({
            timestamp: fields[0],
            customer_id: fields[1],
            organization: fields[2],
            application_name: fields[3],
            expiry_date: fields[4],
            license_status: fields[5] as any,
            license_type: fields[6] as any,
            license_file: fields[7],
            mac_address: fields[8],
            wifi_ssid: fields[9],
            created_at: fields[10],
            updated_at: fields[11],
            notes: fields.slice(12).join(","), // รวม notes ที่อาจมี comma
          });
        }
      }

      return entries;
    } catch {
      // File ไม่มี - สร้างใหม่
      const header = this.getCSVHeader();
      await fs.writeFile(filePath, header + "\n", "utf8");

      if (this.verbose) {
        console.log(chalk.cyan(`info: Created new registry file: ${filePath}`));
      }

      return [];
    }
  }

  /**
   * เขียน registry กลับไปที่ file
   */
  async writeRegistry(entries: RegistryEntry[], date?: Date): Promise<void> {
    const filePath = this.getRegistryFilePath(date);

    const lines = [this.getCSVHeader()];
    entries.forEach((entry) => {
      lines.push(this.entryToCSVRow(entry));
    });

    await fs.writeFile(filePath, lines.join("\n") + "\n", "utf8");

    if (this.verbose) {
      console.log(chalk.cyan(`info: Updated registry file: ${filePath}`));
    }
  }

  /**
   * เพิ่ม license entry เข้า registry
   */
  async addLicenseEntry(
    licenseFilePath: string,
    options: {
      customerData?: {
        customer_id: string;
        organization: string;
        application_name: string;
        mac_address: string;
        wifi_ssid: string;
      };
      notes?: string;
    } = {}
  ): Promise<void> {
    // อ่านข้อมูลจาก license file
    const licenseContent = await fs.readFile(licenseFilePath, "utf8");
    const validation = getLicenseFileBasicInfo(licenseContent);

    if (!validation.isValid || !validation.fileInfo) {
      throw new Error(`Invalid license file: ${validation.errors.join(", ")}`);
    }

    const licenseData = JSON.parse(licenseContent);
    const now = new Date().toISOString();

    // Extract license_type from license data if available
    let extractedLicenseType: "production" | "internal" | "development" =
      "production";
    try {
      // Try to extract license_type from the license file structure
      if (licenseData.license_type) {
        extractedLicenseType = licenseData.license_type;
      }
    } catch (error) {
      // If extraction fails, default to 'production'
      console.log(
        "warn: Could not extract license_type, defaulting to production"
      );
    }

    // สร้าง registry entry
    const entry: RegistryEntry = {
      timestamp: now,
      customer_id: options.customerData?.customer_id || "UNKNOWN",
      organization: options.customerData?.organization || "UNKNOWN",
      application_name: options.customerData?.application_name || "UNKNOWN",
      expiry_date: "ENCRYPTED", // ข้อมูลถูกเข้ารหัสใน HKDF
      license_status: "generated",
      license_type: extractedLicenseType,
      license_file: path.basename(licenseFilePath),
      mac_address: "ENCRYPTED", // ข้อมูลถูกเข้ารหัสใน HKDF
      wifi_ssid: "ENCRYPTED",
      created_at: validation.fileInfo.created_at,
      updated_at: now,
      notes: options.notes || "",
    };

    // อ่าน existing registry
    const entries = await this.readOrCreateRegistry();

    // ตรวจสอบ duplicate
    const existing = entries.find(
      (e) =>
        e.customer_id === entry.customer_id &&
        e.license_file === entry.license_file
    );

    if (existing) {
      // อัพเดต existing entry
      existing.updated_at = now;
      existing.notes = entry.notes;

      if (this.verbose) {
        console.log(
          chalk.yellow(`info: Updated existing entry for ${entry.customer_id}`)
        );
      }
    } else {
      // เพิ่มใหม่
      entries.push(entry);

      if (this.verbose) {
        console.log(
          chalk.green(`info: Added new registry entry for ${entry.customer_id}`)
        );
      }
    }

    // เขียนกลับไปที่ registry
    await this.writeRegistry(entries);
  }

  /**
   * อัพเดต expiry date ของ customer ใน registry
   */
  async updateExpiryInRegistry(
    customerId: string,
    newExpiryDate: string,
    notes?: string
  ): Promise<void> {
    const entries = await this.readOrCreateRegistry();

    const entry = entries.find((e) => e.customer_id === customerId);
    if (!entry) {
      throw new Error(`Customer ${customerId} not found in registry`);
    }

    const now = new Date().toISOString();
    entry.expiry_date = newExpiryDate;
    entry.license_status = "updated";
    entry.updated_at = now;
    if (notes) {
      entry.notes = notes;
    }

    await this.writeRegistry(entries);

    if (this.verbose) {
      console.log(
        chalk.green(
          `info: Updated expiry for ${customerId} to ${newExpiryDate}`
        )
      );
    }
  }

  /**
   * Export registry statistics
   */
  async getRegistryStats(date?: Date): Promise<{
    total: number;
    byStatus: Record<string, number>;
    entries: RegistryEntry[];
  }> {
    const entries = await this.readOrCreateRegistry(date);

    const byStatus: Record<string, number> = {};
    entries.forEach((entry) => {
      byStatus[entry.license_status] =
        (byStatus[entry.license_status] || 0) + 1;
    });

    return {
      total: entries.length,
      byStatus,
      entries,
    };
  }

  /**
   * แสดง registry summary
   */
  async displayRegistrySummary(date?: Date): Promise<void> {
    const stats = await this.getRegistryStats(date);
    const fileName = this.getRegistryFileName(date);

    console.log(chalk.blue(`\n📊 License Registry Summary: ${fileName}`));
    console.log(chalk.gray("====================================="));
    console.log(chalk.white(`Total Licenses: ${stats.total}`));

    if (stats.total > 0) {
      console.log(chalk.cyan("\n📋 Status Breakdown:"));
      Object.entries(stats.byStatus).forEach(([status, count]) => {
        const color =
          status === "active"
            ? chalk.green
            : status === "expired"
            ? chalk.red
            : status === "updated"
            ? chalk.yellow
            : chalk.white;
        console.log(color(`   ${status}: ${count}`));
      });

      console.log(chalk.cyan("\n📝 Recent Entries:"));
      const recentEntries = stats.entries
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .slice(0, 5);

      recentEntries.forEach((entry) => {
        console.log(
          chalk.white(
            `   ${entry.customer_id} (${entry.organization}) - ${entry.license_status}`
          )
        );
      });
    }

    console.log(
      chalk.gray(`\nRegistry File: ${this.getRegistryFilePath(date)}`)
    );
  }

  /**
   * Log internal license generation for audit purposes
   * Enhanced logging for internal license tracking
   */
  async logInternalLicenseGeneration(licenseData: {
    organization: string;
    customer_id: string;
    application_name: string;
    license_type: "internal" | "development";
    file_path: string;
    generated_by?: string;
    purpose?: string;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const auditEntry = {
      timestamp,
      action: "INTERNAL_LICENSE_GENERATED",
      license_type: licenseData.license_type,
      organization: licenseData.organization,
      customer_id: licenseData.customer_id,
      application_name: licenseData.application_name,
      file_path: licenseData.file_path,
      generated_by: licenseData.generated_by || "CLI_USER",
      purpose: licenseData.purpose || "INTERNAL_USE",
      audit_level: "HIGH",
    };

    // Log to console for immediate visibility
    if (this.verbose) {
      console.log(chalk.yellow("\n🔍 AUDIT LOG: Internal License Generated"));
      console.log(chalk.gray(`   Timestamp: ${timestamp}`));
      console.log(
        chalk.gray(`   Type: ${licenseData.license_type.toUpperCase()}`)
      );
      console.log(chalk.gray(`   Organization: ${licenseData.organization}`));
      console.log(chalk.gray(`   Customer: ${licenseData.customer_id}`));
      console.log(chalk.gray(`   Generated by: ${auditEntry.generated_by}`));
    }

    // Add to regular registry with special audit notes
    await this.addLicenseEntry(licenseData.file_path, {
      customerData: {
        customer_id: licenseData.customer_id,
        organization: licenseData.organization,
        application_name: licenseData.application_name,
        mac_address: "INTERNAL_LICENSE",
        wifi_ssid: "N/A",
      },
      notes: `AUDIT: ${licenseData.license_type.toUpperCase()} license generated by ${
        auditEntry.generated_by
      } for ${auditEntry.purpose}`,
    });
  }

  /**
   * Get statistics with license type breakdown
   */
  async getLicenseTypeStats(): Promise<{
    total: number;
    production: number;
    internal: number;
    development: number;
    by_status: Record<string, number>;
  }> {
    const entries = await this.readOrCreateRegistry();

    const stats = {
      total: entries.length,
      production: 0,
      internal: 0,
      development: 0,
      by_status: {} as Record<string, number>,
    };

    entries.forEach((entry) => {
      // Count by license type
      if (entry.license_type === "production") stats.production++;
      else if (entry.license_type === "internal") stats.internal++;
      else if (entry.license_type === "development") stats.development++;

      // Count by status
      stats.by_status[entry.license_status] =
        (stats.by_status[entry.license_status] || 0) + 1;
    });

    return stats;
  }
}

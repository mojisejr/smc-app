import { Setting } from '../model/setting.model';
import { Slot } from '../model/slot.model';
import { CU12Device } from '../../main/hardware/cu12/device';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CU12Settings {
  id: number;
  cu_port: string;
  cu_baudrate: number;
  available_slots: number;
  ku_port?: string | null;
  ku_baudrate?: number | null;
  max_user: number;
  service_code: string;
  max_log_counts: number;
  organization: string;
  customer_name: string;
  activated_key: string;
  indi_port: string;
  indi_baudrate: number;
}

export class CU12ConfigValidator {
  /**
   * Validate CU12 settings configuration
   */
  static validateSettings(settings: Partial<CU12Settings>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // CU12 Port validation
    if (!settings.cu_port) {
      errors.push('CU12 port is required for 12-slot system');
    } else if (typeof settings.cu_port !== 'string' || settings.cu_port.trim().length === 0) {
      errors.push('CU12 port must be a non-empty string');
    }

    // Baudrate validation
    const validBaudrates = [9600, 19200, 57600, 115200];
    if (!settings.cu_baudrate) {
      errors.push('CU12 baudrate is required');
    } else if (!validBaudrates.includes(settings.cu_baudrate)) {
      errors.push(`Invalid CU12 baudrate. Must be one of: ${validBaudrates.join(', ')}`);
    }

    // Slot count validation
    if (settings.available_slots !== undefined) {
      if (settings.available_slots !== 12) {
        errors.push('Available slots must be exactly 12 for CU12 system');
      }
    }

    // Legacy KU16 settings validation (warnings)
    if (settings.ku_port && !settings.cu_port) {
      warnings.push('KU16 configuration detected but no CU12 configuration - migration may be needed');
    }

    if (settings.ku_baudrate && !settings.cu_baudrate) {
      warnings.push('KU16 baudrate found but no CU12 baudrate - using default 19200');
    }

    // System settings validation
    if (settings.max_user !== undefined && settings.max_user <= 0) {
      errors.push('Max user count must be greater than 0');
    }

    if (settings.max_log_counts !== undefined && settings.max_log_counts <= 0) {
      errors.push('Max log count must be greater than 0');
    }

    // Indicator port validation
    if (settings.indi_port && typeof settings.indi_port !== 'string') {
      errors.push('Indicator port must be a string');
    }

    const validIndiBaudrates = [9600, 19200, 57600, 115200];
    if (settings.indi_baudrate && !validIndiBaudrates.includes(settings.indi_baudrate)) {
      warnings.push(`Indicator baudrate ${settings.indi_baudrate} may not be supported`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Test CU12 hardware connection
   */
  static async testCU12Connection(settings: CU12Settings): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      console.log(`Testing CU12 connection on ${settings.cu_port} at ${settings.cu_baudrate} baud...`);

      const testDevice = new CU12Device({
        port: settings.cu_port,
        baudRate: settings.cu_baudrate,
        timeout: 5000
      });

      // Test device initialization
      const initSuccess = await testDevice.initialize();
      if (!initSuccess) {
        errors.push('Failed to initialize CU12 device');
        return { isValid: false, errors, warnings };
      }

      // Test basic communication
      const isConnected = testDevice.isConnected();
      if (!isConnected) {
        errors.push('CU12 device not responding');
        return { isValid: false, errors, warnings };
      }

      // Test slot status communication
      try {
        const slotStatus = await testDevice.getSlotStatus();
        if (!slotStatus || slotStatus.length === 0) {
          warnings.push('No slot status received from CU12 device');
        } else if (slotStatus.length !== 12) {
          warnings.push(`Expected 12 slots, received ${slotStatus.length} slot statuses`);
        } else {
          console.log(`✅ CU12 connection test successful - ${slotStatus.length} slots detected`);
        }
      } catch (statusError) {
        warnings.push(`Could not retrieve slot status: ${statusError.message}`);
      }

      // Clean up connection
      await testDevice.disconnect();

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`CU12 connection test failed: ${error.message}`);
      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Validate slot configuration for CU12 system
   */
  static async validateSlotConfiguration(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check total slot count
      const totalSlots = await Slot.count();
      if (totalSlots === 0) {
        errors.push('No slot records found in database');
        return { isValid: false, errors, warnings };
      }

      // Check active slot count
      const activeSlots = await Slot.count({ where: { isActive: true } });
      if (activeSlots === 0) {
        errors.push('No active slots found - at least some slots should be active');
      } else if (activeSlots > 12) {
        errors.push(`Too many active slots: ${activeSlots}. CU12 supports maximum 12 slots`);
      } else if (activeSlots < 12) {
        warnings.push(`Only ${activeSlots} slots are active. CU12 supports up to 12 slots`);
      }

      // Check slot ID range
      const minSlotId = await Slot.min('slotId') as number;
      const maxSlotId = await Slot.max('slotId') as number;

      if (minSlotId < 1) {
        errors.push(`Invalid minimum slot ID: ${minSlotId}. Slot IDs must start from 1`);
      }

      if (maxSlotId > 15) {
        warnings.push(`Slot ID ${maxSlotId} exceeds expected range (1-15)`);
      }

      // Check for gaps in slot IDs (1-12 should exist for CU12)
      const missingSlots: number[] = [];
      for (let slotId = 1; slotId <= 12; slotId++) {
        const slotExists = await Slot.count({ where: { slotId } });
        if (slotExists === 0) {
          missingSlots.push(slotId);
        }
      }

      if (missingSlots.length > 0) {
        errors.push(`Missing required slot records: ${missingSlots.join(', ')}`);
      }

      // Check for inconsistent slot states
      const occupiedButInactive = await Slot.count({
        where: {
          occupied: true,
          isActive: false
        }
      });

      if (occupiedButInactive > 0) {
        warnings.push(`${occupiedButInactive} slots are marked as occupied but inactive`);
      }

      console.log(`Slot validation - Total: ${totalSlots}, Active: ${activeSlots}, Range: ${minSlotId}-${maxSlotId}`);

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`Slot validation failed: ${error.message}`);
      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Validate complete CU12 system configuration
   */
  static async validateSystemConfiguration(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get current settings
      const setting = await Setting.findByPk(1);
      if (!setting) {
        errors.push('No settings record found in database');
        return { isValid: false, errors, warnings };
      }

      // Validate settings
      const settingsValidation = this.validateSettings(setting);
      errors.push(...settingsValidation.errors);
      warnings.push(...settingsValidation.warnings);

      // Validate slot configuration
      const slotsValidation = await this.validateSlotConfiguration();
      errors.push(...slotsValidation.errors);
      warnings.push(...slotsValidation.warnings);

      // Test hardware connection if settings are valid
      if (settingsValidation.isValid && setting.cu_port && setting.cu_baudrate) {
        try {
          const connectionTest = await this.testCU12Connection(setting as CU12Settings);
          errors.push(...connectionTest.errors);
          warnings.push(...connectionTest.warnings);
        } catch (connectionError) {
          warnings.push(`Could not test hardware connection: ${connectionError.message}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`System validation failed: ${error.message}`);
      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Generate configuration recommendations
   */
  static async generateRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];

    try {
      const setting = await Setting.findByPk(1);
      if (!setting) {
        recommendations.push('Create initial system settings');
        return recommendations;
      }

      // Hardware configuration recommendations
      if (!setting.cu_port) {
        if (setting.ku_port) {
          recommendations.push(`Consider migrating KU16 port (${setting.ku_port}) to CU12 configuration`);
        } else {
          recommendations.push('Configure CU12 hardware port for 12-slot system');
        }
      }

      if (!setting.cu_baudrate) {
        recommendations.push('Set CU12 baudrate to 19200 (recommended default)');
      }

      if (setting.available_slots !== 12) {
        recommendations.push('Update available_slots to 12 for optimal CU12 performance');
      }

      // Slot configuration recommendations
      const activeSlots = await Slot.count({ where: { isActive: true } });
      if (activeSlots < 12) {
        recommendations.push(`Consider activating additional slots (currently ${activeSlots}/12 active)`);
      }

      // Legacy cleanup recommendations
      if (setting.ku_port && setting.cu_port) {
        recommendations.push('Consider removing legacy KU16 configuration after successful CU12 migration');
      }

      // Performance optimization recommendations
      const occupiedSlots = await Slot.count({ where: { occupied: true } });
      if (occupiedSlots === 0) {
        recommendations.push('System ready for medication loading and dispensing operations');
      }

    } catch (error) {
      recommendations.push(`Unable to generate recommendations: ${error.message}`);
    }

    return recommendations;
  }
}
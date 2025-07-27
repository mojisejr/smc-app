import { Transaction } from 'sequelize';
import { sequelize } from '../sequelize';
import { Slot } from '../model/slot.model';
import { Log } from '../model/logs.model';

export interface SlotInitializationResult {
  success: boolean;
  created: number;
  updated: number;
  deactivated: number;
  errors: string[];
}

export interface SlotConfiguration {
  slotId: number;
  isActive: boolean;
  hn: string;
  timestamp: number;
  occupied: boolean;
  opening: boolean;
}

export class CU12SlotInitializer {
  /**
   * Initialize complete slot configuration for CU12 system
   */
  static async initializeSlotConfiguration(): Promise<SlotInitializationResult> {
    const result: SlotInitializationResult = {
      success: false,
      created: 0,
      updated: 0,
      deactivated: 0,
      errors: []
    };

    const transaction = await sequelize.transaction();

    try {
      console.log('🎰 Initializing CU12 slot configuration...');

      // Initialize all 15 slots (12 active for CU12, 3 inactive for backward compatibility)
      for (let slotId = 1; slotId <= 15; slotId++) {
        const isActive = slotId <= 12; // Only first 12 slots active for CU12

        const [slot, created] = await Slot.findOrCreate({
          where: { slotId },
          defaults: {
            slotId,
            hn: '',
            timestamp: Date.now(),
            occupied: false,
            opening: false,
            isActive
          },
          transaction
        });

        if (created) {
          result.created++;
          console.log(`✅ Created slot ${slotId} (${isActive ? 'active' : 'inactive'})`);
        } else {
          // Update existing slot if needed
          const needsUpdate = slot.isActive !== isActive;
          
          if (needsUpdate) {
            await slot.update({ isActive }, { transaction });
            result.updated++;
            
            if (!isActive) {
              result.deactivated++;
              console.log(`📴 Deactivated slot ${slotId} for CU12 compatibility`);
            } else {
              console.log(`🔄 Updated slot ${slotId} configuration`);
            }
          }
        }
      }

      await transaction.commit();

      // Log initialization success
      await Log.create({
        user: 'system',
        message: `CU12 slot initialization completed - Created: ${result.created}, Updated: ${result.updated}, Deactivated: ${result.deactivated}`
      });

      result.success = true;
      console.log(`✅ Slot initialization completed successfully`);

      return result;

    } catch (error) {
      await transaction.rollback();
      result.errors.push(error.message);
      console.error('❌ Slot initialization failed:', error.message);

      await Log.create({
        user: 'system',
        message: `CU12 slot initialization failed: ${error.message}`
      });

      return result;
    }
  }

  /**
   * Validate slot integrity for CU12 system
   */
  static async validateSlotIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
    statistics: {
      totalSlots: number;
      activeSlots: number;
      inactiveSlots: number;
      occupiedSlots: number;
      openingSlots: number;
    };
  }> {
    const issues: string[] = [];

    try {
      // Get slot statistics
      const totalSlots = await Slot.count();
      const activeSlots = await Slot.count({ where: { isActive: true } });
      const inactiveSlots = await Slot.count({ where: { isActive: false } });
      const occupiedSlots = await Slot.count({ where: { occupied: true } });
      const openingSlots = await Slot.count({ where: { opening: true } });

      const statistics = {
        totalSlots,
        activeSlots,
        inactiveSlots,
        occupiedSlots,
        openingSlots
      };

      // Check total slot count
      if (totalSlots === 0) {
        issues.push('No slot records found');
      } else if (totalSlots < 12) {
        issues.push(`Insufficient slots: ${totalSlots} (minimum 12 required for CU12)`);
      }

      // Check active slot count for CU12
      if (activeSlots === 0) {
        issues.push('No active slots found');
      } else if (activeSlots > 12) {
        issues.push(`Too many active slots: ${activeSlots} (CU12 supports maximum 12)`);
      }

      // Check slot ID continuity (slots 1-12 should exist and be active)
      const missingActiveSlots: number[] = [];
      for (let slotId = 1; slotId <= 12; slotId++) {
        const slot = await Slot.findOne({ where: { slotId, isActive: true } });
        if (!slot) {
          missingActiveSlots.push(slotId);
        }
      }

      if (missingActiveSlots.length > 0) {
        issues.push(`Missing active slots: ${missingActiveSlots.join(', ')}`);
      }

      // Check for invalid slot IDs
      const invalidSlots = await Slot.findAll({
        where: {
          slotId: { [sequelize.Op.or]: [{ [sequelize.Op.lt]: 1 }, { [sequelize.Op.gt]: 15 }] }
        }
      });

      if (invalidSlots.length > 0) {
        const invalidIds = invalidSlots.map(slot => slot.slotId);
        issues.push(`Invalid slot IDs found: ${invalidIds.join(', ')}`);
      }

      // Check for data inconsistencies
      const inconsistentSlots = await Slot.findAll({
        where: {
          occupied: true,
          isActive: false
        }
      });

      if (inconsistentSlots.length > 0) {
        const inconsistentIds = inconsistentSlots.map(slot => slot.slotId);
        issues.push(`Occupied but inactive slots: ${inconsistentIds.join(', ')}`);
      }

      // Check for opening slots that are not active
      const invalidOpeningSlots = await Slot.findAll({
        where: {
          opening: true,
          isActive: false
        }
      });

      if (invalidOpeningSlots.length > 0) {
        const invalidIds = invalidOpeningSlots.map(slot => slot.slotId);
        issues.push(`Opening but inactive slots: ${invalidIds.join(', ')}`);
      }

      console.log(`Slot integrity check - Total: ${totalSlots}, Active: ${activeSlots}, Issues: ${issues.length}`);

      return {
        isValid: issues.length === 0,
        issues,
        statistics
      };

    } catch (error) {
      issues.push(`Integrity validation failed: ${error.message}`);
      return {
        isValid: false,
        issues,
        statistics: {
          totalSlots: 0,
          activeSlots: 0,
          inactiveSlots: 0,
          occupiedSlots: 0,
          openingSlots: 0
        }
      };
    }
  }

  /**
   * Reset slot configuration to default CU12 state
   */
  static async resetToDefaultConfiguration(): Promise<SlotInitializationResult> {
    const result: SlotInitializationResult = {
      success: false,
      created: 0,
      updated: 0,
      deactivated: 0,
      errors: []
    };

    const transaction = await sequelize.transaction();

    try {
      console.log('🔄 Resetting slots to default CU12 configuration...');

      // Reset all existing slots
      const existingSlots = await Slot.findAll({ transaction });
      
      for (const slot of existingSlots) {
        const shouldBeActive = slot.slotId <= 12;
        
        await slot.update({
          hn: '',
          timestamp: Date.now(),
          occupied: false,
          opening: false,
          isActive: shouldBeActive
        }, { transaction });

        result.updated++;
        
        if (!shouldBeActive && slot.isActive) {
          result.deactivated++;
        }
      }

      // Create any missing slots (1-15)
      for (let slotId = 1; slotId <= 15; slotId++) {
        const exists = existingSlots.find(slot => slot.slotId === slotId);
        
        if (!exists) {
          await Slot.create({
            slotId,
            hn: '',
            timestamp: Date.now(),
            occupied: false,
            opening: false,
            isActive: slotId <= 12
          }, { transaction });

          result.created++;
        }
      }

      await transaction.commit();

      await Log.create({
        user: 'system',
        message: `CU12 slot configuration reset to defaults - Updated: ${result.updated}, Created: ${result.created}`
      });

      result.success = true;
      console.log('✅ Slot configuration reset completed');

      return result;

    } catch (error) {
      await transaction.rollback();
      result.errors.push(error.message);
      console.error('❌ Slot configuration reset failed:', error.message);
      return result;
    }
  }

  /**
   * Get current slot configuration summary
   */
  static async getConfigurationSummary(): Promise<{
    configuration: 'CU12' | 'KU16' | 'MIXED' | 'UNKNOWN';
    details: {
      totalSlots: number;
      activeSlots: number;
      slotRange: string;
      isValid: boolean;
      recommendations: string[];
    };
  }> {
    try {
      const totalSlots = await Slot.count();
      const activeSlots = await Slot.count({ where: { isActive: true } });
      
      if (totalSlots === 0) {
        return {
          configuration: 'UNKNOWN',
          details: {
            totalSlots: 0,
            activeSlots: 0,
            slotRange: 'N/A',
            isValid: false,
            recommendations: ['Initialize slot configuration']
          }
        };
      }

      const minSlotId = await Slot.min('slotId') as number;
      const maxSlotId = await Slot.max('slotId') as number;
      const slotRange = `${minSlotId}-${maxSlotId}`;

      // Determine configuration type
      let configuration: 'CU12' | 'KU16' | 'MIXED' | 'UNKNOWN';
      const recommendations: string[] = [];

      if (activeSlots === 12 && totalSlots >= 12) {
        configuration = 'CU12';
      } else if (activeSlots === 15) {
        configuration = 'KU16';
        recommendations.push('Consider migrating to CU12 (12-slot) configuration');
      } else if (activeSlots > 0 && activeSlots < 15) {
        configuration = 'MIXED';
        recommendations.push('Standardize slot configuration for either CU12 (12 slots) or KU16 (15 slots)');
      } else {
        configuration = 'UNKNOWN';
        recommendations.push('Review and fix slot configuration');
      }

      // Validate configuration
      const isValid = (configuration === 'CU12' && activeSlots === 12) ||
                     (configuration === 'KU16' && activeSlots === 15);

      if (!isValid) {
        if (activeSlots === 0) {
          recommendations.push('Activate required slots for system operation');
        }
        if (totalSlots < 12) {
          recommendations.push('Create missing slot records');
        }
      }

      return {
        configuration,
        details: {
          totalSlots,
          activeSlots,
          slotRange,
          isValid,
          recommendations
        }
      };

    } catch (error) {
      return {
        configuration: 'UNKNOWN',
        details: {
          totalSlots: 0,
          activeSlots: 0,
          slotRange: 'Error',
          isValid: false,
          recommendations: [`Error analyzing configuration: ${error.message}`]
        }
      };
    }
  }
}
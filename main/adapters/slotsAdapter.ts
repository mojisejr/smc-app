import { ipcMain, BrowserWindow } from 'electron';
import { KU16 } from '../ku16';
import { CU12SmartStateManager } from '../hardware/cu12/stateManager';
import { getHardwareType } from '../setting/getHardwareType';
import { getAllSlots } from '../setting/getallSlots';
import { Slot } from '../../db/model/slot.model';
import { logger } from '../logger';

/**
 * Universal Slot Management Adapter
 * 
 * Provides hardware-agnostic slot status retrieval and management
 * by ensuring proper synchronization between hardware state and database state.
 * 
 * Key Features:
 * - Hardware-aware slot status retrieval
 * - Real-time CU12 state synchronization
 * - Consistent slot data format across hardware types
 * - Automatic slot activation detection for CU12
 */

export const registerUniversalGetAllSlotsHandler = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow
) => {
  ipcMain.handle('get-all-slots', async (event, payload) => {
    try {
      // Get current hardware configuration
      const hardwareInfo = await getHardwareType();
      
      console.log(`[UNIVERSAL-ADAPTER] get-all-slots routing to ${hardwareInfo.type}`);

      if (hardwareInfo.type === 'CU12' && cu12StateManager) {
        // CU12 Mode - Sync hardware state before returning slots
        try {
          // Force hardware synchronization to get current slot states
          const currentSlotStatus = await cu12StateManager.syncSlotStatus('MANUAL_SYNC');
          
          console.log(`[UNIVERSAL-ADAPTER] CU12 slot sync completed, ${currentSlotStatus.length} slots detected`);
          
          // Update database with current hardware state
          for (const slotStatus of currentSlotStatus) {
            await Slot.upsert({
              slotId: slotStatus.slotId,
              isActive: slotStatus.isConnected && slotStatus.isLocked, // Active if connected and locked
              lastUpdated: new Date()
            });
          }

          await logger({
            user: 'system',
            message: `CU12 slot status sync: ${currentSlotStatus.length} slots updated`,
          });

        } catch (syncError) {
          console.warn('[UNIVERSAL-ADAPTER] CU12 sync failed, using database state:', syncError.message);
          
          await logger({
            user: 'system',
            message: `CU12 slot sync failed: ${syncError.message}, using database state`,
          });
        }

        // Return slots using the standard getAllSlots function (now with updated data)
        const slots = await getAllSlots();
        
        return slots.map(slot => ({
          ...slot,
          hardwareType: 'CU12',
          maxSlots: hardwareInfo.maxSlots
        }));

      } else if (hardwareInfo.type === 'KU16' && ku16Instance) {
        // KU16 Mode - Use existing slot retrieval
        console.log('[UNIVERSAL-ADAPTER] KU16 slot retrieval using standard method');
        
        // Trigger state check for KU16 to ensure current status
        ku16Instance.sendCheckState();
        
        const slots = await getAllSlots();
        
        return slots.map(slot => ({
          ...slot,
          hardwareType: 'KU16',
          maxSlots: hardwareInfo.maxSlots
        }));

      } else {
        // Fallback - Use database-only retrieval
        console.log('[UNIVERSAL-ADAPTER] No hardware initialized, using database-only retrieval');
        
        const slots = await getAllSlots();
        
        return slots.map(slot => ({
          ...slot,
          hardwareType: hardwareInfo.type || 'UNKNOWN',
          maxSlots: hardwareInfo.maxSlots || 15
        }));
      }

    } catch (error) {
      await logger({
        user: 'system',
        message: `get-all-slots error: ${error.message}`,
      });

      console.error('[UNIVERSAL-ADAPTER] get-all-slots failed:', error.message);
      
      // Fallback to basic database retrieval
      const slots = await getAllSlots();
      return slots;
    }
  });
};

/**
 * Universal Slot Activation Status Handler
 * 
 * Provides real-time slot activation status for admin dashboard
 * Especially important for CU12 where slot status needs hardware sync
 */
export const registerUniversalSlotStatusHandler = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow
) => {
  ipcMain.handle('get-slot-status', async (event, payload) => {
    try {
      const { slotId } = payload;
      const hardwareInfo = await getHardwareType();
      
      console.log(`[UNIVERSAL-ADAPTER] get-slot-status for slot ${slotId} routing to ${hardwareInfo.type}`);

      if (hardwareInfo.type === 'CU12' && cu12StateManager) {
        // Get real-time status from CU12 hardware
        const slotStatuses = await cu12StateManager.syncSlotStatus('REAL_TIME');
        const targetSlot = slotStatuses.find(slot => slot.slotId === slotId);
        
        if (!targetSlot) {
          throw new Error(`Slot ${slotId} not found in hardware`);
        }

        return {
          slotId: targetSlot.slotId,
          isActive: targetSlot.isConnected && targetSlot.isLocked,
          isConnected: targetSlot.isConnected,
          isLocked: targetSlot.isLocked,
          hardwareType: 'CU12',
          statusText: (targetSlot.isConnected && targetSlot.isLocked) ? "เปิดใช้งาน" : "ปิดใช้งาน"
        };

      } else if (hardwareInfo.type === 'KU16' && ku16Instance) {
        // Get status from KU16 (trigger state check first)
        ku16Instance.sendCheckState();
        
        const slot = await Slot.findOne({ where: { slotId } });
        
        if (!slot) {
          throw new Error(`Slot ${slotId} not found`);
        }

        return {
          slotId: slot.dataValues.slotId,
          isActive: slot.dataValues.isActive,
          hardwareType: 'KU16',
          statusText: slot.dataValues.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"
        };

      } else {
        throw new Error(`Hardware ${hardwareInfo.type} not initialized`);
      }

    } catch (error) {
      await logger({
        user: 'system',
        message: `get-slot-status error for slot ${payload.slotId}: ${error.message}`,
      });

      throw error;
    }
  });
};
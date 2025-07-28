import { ipcMain, BrowserWindow } from 'electron';
import { KU16 } from '../ku16';
import { CU12SmartStateManager } from '../hardware/cu12/stateManager';
import { getHardwareType } from '../setting/getHardwareType';
import { User } from '../../db/model/user.model';
import { Slot } from '../../db/model/slot.model';
import { logger } from '../logger';

/**
 * Universal Admin Management Adapters
 * 
 * These adapters provide hardware-agnostic admin slot management functionality
 * by routing calls to the appropriate hardware implementation based on system configuration.
 * 
 * Supported Operations:
 * - deactivate-admin: Single slot deactivation by admin
 * - deactivate-all: Bulk deactivation of all slots
 * - reactivate-all: Bulk reactivation of all slots
 */

export const registerUniversalDeactivateAdminHandler = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow
) => {
  ipcMain.handle('deactivate-admin', async (event, payload) => {
    try {
      // Validate admin permissions
      const user = await User.findOne({
        where: { name: payload.name }
      });

      if (!user || user.dataValues.role !== 'ADMIN') {
        await logger({
          user: 'system',
          message: `deactivate-admin: unauthorized attempt by ${payload.name}`,
        });
        throw new Error('ไม่สามารถปิดช่องได้ - ไม่มีสิทธิ์');
      }

      // Get current hardware configuration
      const hardwareInfo = await getHardwareType();
      
      console.log(`[UNIVERSAL-ADAPTER] deactivate-admin routing to ${hardwareInfo.type} for slot ${payload.slotId}`);

      if (hardwareInfo.type === 'CU12' && cu12StateManager) {
        // Route to CU12 deactivation - Direct database update (same as KU16)
        await logger({
          user: 'system',
          message: `CU12 deactivate-admin: slot #${payload.slotId} by ${payload.name}`,
        });

        // Direct database update for admin setting
        await Slot.update(
          { isActive: false },
          { where: { slotId: payload.slotId } }
        );

        // Trigger frontend sync to update UI immediately
        await cu12StateManager.triggerFrontendSync();

        await logger({
          user: 'system',
          message: `CU12 deactivate-admin: slot #${payload.slotId} by ${payload.name} completed`,
        });

        return {
          success: true,
          slotId: payload.slotId,
          message: 'ปิดใช้งานช่องเก็บยาสำเร็จ'
        };

      } else if (hardwareInfo.type === 'KU16' && ku16Instance) {
        // Route to KU16 deactivation
        await logger({
          user: 'system',
          message: `KU16 deactivate-admin: slot #${payload.slotId} by ${payload.name}`,
        });

        const result = await ku16Instance.deactivate(payload.slotId);
        await ku16Instance.sleep(1000);
        ku16Instance.sendCheckState();

        await logger({
          user: 'system',
          message: `KU16 deactivate-admin: slot #${payload.slotId} by ${payload.name} completed`,
        });

        return result;

      } else {
        throw new Error(`Hardware ${hardwareInfo.type} not initialized or not supported`);
      }

    } catch (error) {
      await logger({
        user: 'system',
        message: `deactivate-admin: slot #${payload.slotId} by ${payload.name} error - ${error.message}`,
      });

      mainWindow.webContents.send('deactivate-admin-error', {
        message: 'ไม่สามารถปิดช่องได้',
        slotId: payload.slotId,
        error: error.message
      });

      throw error;
    }
  });
};

export const registerUniversalDeactivateAllHandler = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow
) => {
  ipcMain.handle('deactivate-all', async (event, payload) => {
    try {
      // Validate admin permissions
      const user = await User.findOne({
        where: { name: payload.name }
      });

      if (!user || user.dataValues.role !== 'ADMIN') {
        await logger({
          user: 'system',
          message: `deactivate-all: unauthorized attempt by ${payload.name}`,
        });
        throw new Error('ไม่สามารถปิดระบบทั้งหมดได้ - ไม่มีสิทธิ์');
      }

      // Get current hardware configuration
      const hardwareInfo = await getHardwareType();
      
      console.log(`[UNIVERSAL-ADAPTER] deactivate-all routing to ${hardwareInfo.type}`);

      if (hardwareInfo.type === 'CU12' && cu12StateManager) {
        // Route to CU12 bulk deactivation - Direct database update
        await logger({
          user: 'system',
          message: `CU12 deactivate-all by ${payload.name}`,
        });

        // Direct database update for all slots
        await Slot.update(
          { isActive: false },
          { where: { slotId: { [require('sequelize').Op.lte]: 12 } } }
        );

        // Trigger frontend sync to update UI immediately
        await cu12StateManager.triggerFrontendSync();

        await logger({
          user: 'system',
          message: `CU12 deactivate-all by ${payload.name} completed`,
        });

        return {
          success: true,
          message: 'ปิดใช้งานช่องเก็บยาทั้งหมดสำเร็จ'
        };

      } else if (hardwareInfo.type === 'KU16' && ku16Instance) {
        // Route to KU16 bulk deactivation
        await logger({
          user: 'system',
          message: `KU16 deactivate-all by ${payload.name}`,
        });

        const result = await ku16Instance.deactivateAll();
        ku16Instance.sendCheckState();

        await logger({
          user: 'system',
          message: `KU16 deactivate-all by ${payload.name} completed`,
        });

        return result;

      } else {
        throw new Error(`Hardware ${hardwareInfo.type} not initialized or not supported`);
      }

    } catch (error) {
      await logger({
        user: 'system',
        message: `deactivate-all: by ${payload.name} error - ${error.message}`,
      });

      mainWindow.webContents.send('deactivate-all-error', {
        message: 'ไม่สามารถปิดระบบทั้งหมดได้',
        error: error.message
      });

      throw error;
    }
  });
};

export const registerUniversalReactivateAdminHandler = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow
) => {
  ipcMain.handle('reactivate-admin', async (event, payload) => {
    try {
      // Validate admin permissions
      const user = await User.findOne({
        where: { name: payload.name }
      });

      if (!user || user.dataValues.role !== 'ADMIN') {
        await logger({
          user: 'system',
          message: `reactivate-admin: unauthorized attempt by ${payload.name}`,
        });
        throw new Error('ไม่สามารถเปิดช่องได้ - ไม่มีสิทธิ์');
      }

      // Get current hardware configuration
      const hardwareInfo = await getHardwareType();
      
      console.log(`[UNIVERSAL-ADAPTER] reactivate-admin routing to ${hardwareInfo.type} for slot ${payload.slotId}`);

      if (hardwareInfo.type === 'CU12' && cu12StateManager) {
        // Route to CU12 reactivation - Direct database update (same as KU16)
        await logger({
          user: 'system',
          message: `CU12 reactivate-admin: slot #${payload.slotId} by ${payload.name}`,
        });

        // Direct database update for admin setting
        await Slot.update(
          { isActive: true },
          { where: { slotId: payload.slotId } }
        );

        // Trigger frontend sync to update UI immediately
        await cu12StateManager.triggerFrontendSync();

        await logger({
          user: 'system',
          message: `CU12 reactivate-admin: slot #${payload.slotId} by ${payload.name} completed`,
        });

        return {
          success: true,
          slotId: payload.slotId,
          message: 'เปิดใช้งานช่องเก็บยาสำเร็จ'
        };

      } else if (hardwareInfo.type === 'KU16' && ku16Instance) {
        // Route to KU16 reactivation
        await logger({
          user: 'system',
          message: `KU16 reactivate-admin: slot #${payload.slotId} by ${payload.name}`,
        });

        const result = await ku16Instance.reactive(payload.slotId);

        await logger({
          user: 'system',
          message: `KU16 reactivate-admin: slot #${payload.slotId} by ${payload.name} completed`,
        });

        return result;

      } else {
        throw new Error(`Hardware ${hardwareInfo.type} not initialized or not supported`);
      }

    } catch (error) {
      await logger({
        user: 'system',
        message: `reactivate-admin: slot #${payload.slotId} by ${payload.name} error - ${error.message}`,
      });

      mainWindow.webContents.send('reactivate-admin-error', {
        message: 'ไม่สามารถเปิดช่องได้',
        slotId: payload.slotId,
        error: error.message
      });

      throw error;
    }
  });
};

export const registerUniversalReactivateAllHandler = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow
) => {
  ipcMain.handle('reactivate-all', async (event, payload) => {
    try {
      // Validate admin permissions
      const user = await User.findOne({
        where: { name: payload.name }
      });

      if (!user || user.dataValues.role !== 'ADMIN') {
        await logger({
          user: 'system',
          message: `reactivate-all: unauthorized attempt by ${payload.name}`,
        });
        throw new Error('ไม่สามารถเปิดระบบทั้งหมดได้ - ไม่มีสิทธิ์');
      }

      // Get current hardware configuration
      const hardwareInfo = await getHardwareType();
      
      console.log(`[UNIVERSAL-ADAPTER] reactivate-all routing to ${hardwareInfo.type}`);

      if (hardwareInfo.type === 'CU12' && cu12StateManager) {
        // Route to CU12 bulk reactivation - Direct database update
        await logger({
          user: 'system',
          message: `CU12 reactivate-all by ${payload.name}`,
        });

        // Direct database update for all slots
        await Slot.update(
          { isActive: true },
          { where: { slotId: { [require('sequelize').Op.lte]: 12 } } }
        );

        // Trigger frontend sync to update UI immediately
        await cu12StateManager.triggerFrontendSync();

        await logger({
          user: 'system',
          message: `CU12 reactivate-all by ${payload.name} completed`,
        });

        return {
          success: true,
          message: 'เปิดใช้งานช่องเก็บยาทั้งหมดสำเร็จ'
        };

      } else if (hardwareInfo.type === 'KU16' && ku16Instance) {
        // Route to KU16 bulk reactivation
        await logger({
          user: 'system',
          message: `KU16 reactivate-all by ${payload.name}`,
        });

        const result = await ku16Instance.reactiveAll();
        ku16Instance.sendCheckState();

        await logger({
          user: 'system',
          message: `KU16 reactivate-all by ${payload.name} completed`,
        });

        return result;

      } else {
        throw new Error(`Hardware ${hardwareInfo.type} not initialized or not supported`);
      }

    } catch (error) {
      await logger({
        user: 'system',
        message: `reactivate-all: by ${payload.name} error - ${error.message}`,
      });

      mainWindow.webContents.send('reactivate-all-error', {
        message: 'ไม่สามารถเปิดระบบทั้งหมดได้',
        error: error.message
      });

      throw error;
    }
  });
};
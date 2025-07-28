import { ipcMain } from 'electron';
import { updateSetting } from '../updateSetting';

export const setHardwareTypeHandler = () => {
  ipcMain.handle('set-hardware-type', async (event, hardwareType: 'AUTO' | 'KU16' | 'CU12') => {
    try {
      console.log(`[HARDWARE] Setting hardware type to: ${hardwareType}`);
      
      await updateSetting({
        hardware_type: hardwareType
      });
      
      console.log(`[HARDWARE] Hardware type updated successfully to: ${hardwareType}`);
      
      return { 
        success: true, 
        message: `Hardware type set to ${hardwareType}. Please restart the application for changes to take effect.` 
      };
    } catch (error) {
      console.error('[HARDWARE] Failed to set hardware type:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  });
};
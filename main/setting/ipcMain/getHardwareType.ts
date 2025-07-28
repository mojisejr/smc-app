import { ipcMain } from 'electron';
import { getHardwareType } from '../getHardwareType';

export const getHardwareTypeHandler = () => {
  ipcMain.handle('get-hardware-type', async () => {
    try {
      const hardwareInfo = await getHardwareType();
      console.log(`[HARDWARE] Current hardware type: ${hardwareInfo.type}`);
      
      return { 
        success: true, 
        hardwareInfo 
      };
    } catch (error) {
      console.error('[HARDWARE] Failed to get hardware type:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  });
};
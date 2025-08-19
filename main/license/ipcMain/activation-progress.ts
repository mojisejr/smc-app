import { ipcMain, BrowserWindow } from "electron";
import { logger } from "../../logger";

/**
 * Activation Progress Handler
 * 
 * จัดการการส่ง progress updates ไป renderer process
 * สำหรับ real-time activation status
 */

export interface ProgressUpdate {
  step: string;
  progress: number;
  message?: string;
  timestamp: number;
  data?: any;
}

export interface ProgressStep {
  key: string;
  label: string;
  description?: string;
  icon?: string;
}

// Activation steps definition
export const ACTIVATION_STEPS: ProgressStep[] = [
  {
    key: 'file-loading',
    label: 'กำลังโหลดไฟล์ license',
    description: 'ค้นหาและโหลดไฟล์ license.lic',
    icon: '📄'
  },
  {
    key: 'file-parsing',
    label: 'กำลังตรวจสอบไฟล์ license',
    description: 'ถอดรหัสและตรวจสอบความถูกต้องของไฟล์',
    icon: '🔍'
  },
  {
    key: 'expiry-check',
    label: 'ตรวจสอบวันหมดอายุ',
    description: 'ตรวจสอบว่า license ยังไม่หมดอายุ',
    icon: '📅'
  },
  {
    key: 'organization-validation',
    label: 'ตรวจสอบข้อมูลองค์กร',
    description: 'ตรวจสอบข้อมูลองค์กรกับการตั้งค่าระบบ',
    icon: '🏢'
  },
  {
    key: 'wifi-credentials',
    label: 'ดึงข้อมูล WiFi',
    description: 'ดึงข้อมูล WiFi สำหรับเชื่อมต่อ ESP32',
    icon: '🔐'
  },
  {
    key: 'wifi-connecting',
    label: 'เชื่อมต่อ WiFi ESP32',
    description: 'เชื่อมต่อกับเครือข่าย WiFi ของ ESP32',
    icon: '📶'
  },
  {
    key: 'mac-retrieval',
    label: 'ดึง MAC Address',
    description: 'ดึง MAC Address จาก ESP32',
    icon: '🔗'
  },
  {
    key: 'mac-validation',
    label: 'ตรวจสอบ MAC Address',
    description: 'ตรวจสอบ MAC Address กับข้อมูลใน license',
    icon: '✅'
  },
  {
    key: 'saving',
    label: 'บันทึกการ activation',
    description: 'บันทึกสถานะ activation ลงฐานข้อมูล',
    icon: '💾'
  },
  {
    key: 'success',
    label: 'เสร็จสิ้น',
    description: 'การ activation สำเร็จเรียบร้อย',
    icon: '🎉'
  },
  {
    key: 'error',
    label: 'เกิดข้อผิดพลาด',
    description: 'การ activation ล้มเหลว',
    icon: '❌'
  }
];

export class ActivationProgressManager {
  private static instance: ActivationProgressManager;
  private currentWindow: BrowserWindow | null = null;
  private currentProgress: ProgressUpdate | null = null;

  static getInstance(): ActivationProgressManager {
    if (!this.instance) {
      this.instance = new ActivationProgressManager();
    }
    return this.instance;
  }

  setWindow(window: BrowserWindow): void {
    this.currentWindow = window;
  }

  /**
   * ส่ง progress update ไป renderer
   */
  async sendProgress(step: string, progress: number, message?: string, data?: any): Promise<void> {
    const update: ProgressUpdate = {
      step,
      progress: Math.min(100, Math.max(0, progress)), // Clamp between 0-100
      message,
      timestamp: Date.now(),
      data
    };

    this.currentProgress = update;

    // ส่งไป renderer process
    if (this.currentWindow && !this.currentWindow.isDestroyed()) {
      this.currentWindow.webContents.send('activation-progress', update);
    }

    // Log สำหรับ debugging
    console.log(`info: Activation progress - ${step}: ${progress}%${message ? ` - ${message}` : ''}`);

    // Log สำคัญไป audit trail
    if (progress === 100 || step === 'error' || step === 'success') {
      await logger({
        user: "system",
        message: `License activation ${step}: ${progress}%${message ? ` - ${message}` : ''}`
      });
    }
  }

  /**
   * ส่ง error progress
   */
  async sendError(error: string, step?: string): Promise<void> {
    await this.sendProgress(step || 'error', 0, error);
  }

  /**
   * ส่ง success progress
   */
  async sendSuccess(message?: string, data?: any): Promise<void> {
    await this.sendProgress('success', 100, message, data);
  }

  /**
   * ดึง current progress
   */
  getCurrentProgress(): ProgressUpdate | null {
    return this.currentProgress;
  }

  /**
   * Reset progress
   */
  reset(): void {
    this.currentProgress = null;
  }
}

export const activationProgressHandler = async () => {
  
  // Get activation steps definition
  ipcMain.handle("get-activation-steps", async (_event): Promise<ProgressStep[]> => {
    return ACTIVATION_STEPS;
  });

  // Get current progress
  ipcMain.handle("get-activation-progress", async (_event): Promise<ProgressUpdate | null> => {
    const progressManager = ActivationProgressManager.getInstance();
    return progressManager.getCurrentProgress();
  });

  // Reset progress (สำหรับเริ่ม activation ใหม่)
  ipcMain.handle("reset-activation-progress", async (_event): Promise<void> => {
    const progressManager = ActivationProgressManager.getInstance();
    progressManager.reset();
    
    console.log("info: Activation progress reset");
  });

  // Manual progress update (สำหรับ testing หรือ custom step)
  ipcMain.handle("update-activation-progress", async (event, update: Partial<ProgressUpdate>): Promise<void> => {
    const progressManager = ActivationProgressManager.getInstance();
    
    if (update.step && typeof update.progress === 'number') {
      await progressManager.sendProgress(
        update.step, 
        update.progress, 
        update.message, 
        update.data
      );
    } else {
      throw new Error('Missing required step or progress fields');
    }
  });

  // Get step info by key
  ipcMain.handle("get-step-info", async (_event, stepKey: string): Promise<ProgressStep | null> => {
    const step = ACTIVATION_STEPS.find(s => s.key === stepKey);
    return step || null;
  });

  // Bulk progress update (สำหรับ complex workflows)
  ipcMain.handle("batch-activation-progress", async (_event, updates: Partial<ProgressUpdate>[]): Promise<void> => {
    const progressManager = ActivationProgressManager.getInstance();
    
    for (const update of updates) {
      if (update.step && typeof update.progress === 'number') {
        await progressManager.sendProgress(
          update.step,
          update.progress,
          update.message,
          update.data
        );
        
        // Delay เล็กน้อยระหว่าง updates เพื่อ smooth animation
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  });

  // Progress subscription for renderer (alternative to webContents.send)
  ipcMain.handle("subscribe-activation-progress", async (event): Promise<boolean> => {
    try {
      const progressManager = ActivationProgressManager.getInstance();
      const window = BrowserWindow.fromWebContents(event.sender);
      
      if (window) {
        progressManager.setWindow(window);
        console.log("info: Activation progress subscription established");
        return true;
      } else {
        console.log("warn: Could not establish progress subscription - no window found");
        return false;
      }
    } catch (error) {
      console.error("error: Failed to subscribe to activation progress:", error);
      return false;
    }
  });

  // Helper: Calculate progress percentage for specific workflow
  ipcMain.handle("calculate-step-progress", async (_event, currentStep: string, totalSteps?: number): Promise<number> => {
    const stepCount = totalSteps || ACTIVATION_STEPS.filter(s => s.key !== 'error').length;
    const currentIndex = ACTIVATION_STEPS.findIndex(s => s.key === currentStep);
    
    if (currentIndex === -1) {
      return 0;
    }
    
    // คำนวณ percentage based on step position
    const progress = Math.round((currentIndex / (stepCount - 1)) * 100);
    return Math.min(100, Math.max(0, progress));
  });
};

// Export singleton instance สำหรับใช้ใน other modules
export const progressManager = ActivationProgressManager.getInstance();
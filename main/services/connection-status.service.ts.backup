import { KU16 } from "../ku16";
import { CU12SmartStateManager } from "../hardware/cu12/stateManager";
import { getHardwareType } from "../setting/getHardwareType";
import { unifiedLoggingService } from "./unified-logging.service";

export interface ConnectionStatus {
  isConnected: boolean;
  hardwareType: 'KU16' | 'CU12' | 'UNKNOWN';
  lastChecked: Date;
  error?: string;
  message: string;
}

export interface ConnectionValidationResult {
  isValid: boolean;
  status: ConnectionStatus;
  errorMessage?: string;
}

export class ConnectionStatusService {
  private ku16Instance: KU16 | null = null;
  private cu12StateManager: CU12SmartStateManager | null = null;
  private lastStatus: ConnectionStatus | null = null;
  private checkInProgress: boolean = false;

  constructor(
    ku16Instance: KU16 | null = null,
    cu12StateManager: CU12SmartStateManager | null = null
  ) {
    this.ku16Instance = ku16Instance;
    this.cu12StateManager = cu12StateManager;
  }

  setHardwareInstances(
    ku16Instance: KU16 | null,
    cu12StateManager: CU12SmartStateManager | null
  ): void {
    this.ku16Instance = ku16Instance;
    this.cu12StateManager = cu12StateManager;
  }

  async checkConnection(): Promise<ConnectionStatus> {
    if (this.checkInProgress) {
      return this.lastStatus || this.createDisconnectedStatus('Connection check already in progress');
    }

    this.checkInProgress = true;

    try {
      const hardwareInfo = await getHardwareType();
      let status: ConnectionStatus;

      if (hardwareInfo.type === 'CU12' && this.cu12StateManager) {
        status = await this.checkCU12Connection();
      } else if (hardwareInfo.type === 'KU16' && this.ku16Instance) {
        status = await this.checkKU16Connection();
      } else {
        status = this.createDisconnectedStatus(`Hardware ${hardwareInfo.type} not initialized or not supported`);
      }

      this.lastStatus = status;

      await unifiedLoggingService.logInfo({
        message: `Connection check completed: ${status.isConnected ? 'Connected' : 'Disconnected'}`,
        component: 'ConnectionStatusService',
        details: { 
          hardwareType: status.hardwareType, 
          isConnected: status.isConnected,
          error: status.error 
        },
      });

      return status;
    } catch (error) {
      const errorMessage = `Connection check failed: ${error.message}`;
      const status = this.createDisconnectedStatus(errorMessage);
      
      await unifiedLoggingService.logError({
        message: errorMessage,
        component: 'ConnectionStatusService',
        details: { error: error.message },
      });

      this.lastStatus = status;
      return status;
    } finally {
      this.checkInProgress = false;
    }
  }

  private async checkCU12Connection(): Promise<ConnectionStatus> {
    try {
      const isConnected = this.cu12StateManager?.isConnected() || false;
      
      return {
        isConnected,
        hardwareType: 'CU12',
        lastChecked: new Date(),
        message: isConnected 
          ? 'เชื่อมต่อ CU12 Hardware สำเร็จ' 
          : 'ไม่พบการเชื่อมต่อ CU12 Hardware',
        error: isConnected ? undefined : 'CU12 hardware not connected'
      };
    } catch (error) {
      return this.createDisconnectedStatus(`CU12 connection error: ${error.message}`, 'CU12');
    }
  }

  private async checkKU16Connection(): Promise<ConnectionStatus> {
    try {
      const isConnected = this.ku16Instance?.isConnected() || false;
      
      return {
        isConnected,
        hardwareType: 'KU16',
        lastChecked: new Date(),
        message: isConnected 
          ? 'เชื่อมต่อ KU16 Hardware สำเร็จ' 
          : 'ไม่พบการเชื่อมต่อ KU16 Hardware',
        error: isConnected ? undefined : 'KU16 hardware not connected'
      };
    } catch (error) {
      return this.createDisconnectedStatus(`KU16 connection error: ${error.message}`, 'KU16');
    }
  }

  private createDisconnectedStatus(error: string, hardwareType: 'KU16' | 'CU12' | 'UNKNOWN' = 'UNKNOWN'): ConnectionStatus {
    return {
      isConnected: false,
      hardwareType,
      lastChecked: new Date(),
      error,
      message: 'ไม่พบการเชื่อมต่อ Hardware - ตรวจสอบการตั้งค่า'
    };
  }

  async validateBeforeOperation(operationName: string): Promise<ConnectionValidationResult> {
    try {
      const status = await this.checkConnection();
      
      if (!status.isConnected) {
        const errorMessage = `Cannot perform ${operationName}: Hardware not connected`;
        
        await unifiedLoggingService.logWarning({
          message: errorMessage,
          component: 'ConnectionStatusService',
          details: { operation: operationName, hardwareType: status.hardwareType },
        });

        return {
          isValid: false,
          status,
          errorMessage: `ไม่สามารถ${operationName}ได้ - ตรวจสอบการเชื่อมต่อ Hardware`
        };
      }

      return {
        isValid: true,
        status
      };
    } catch (error) {
      const errorMessage = `Validation error for ${operationName}: ${error.message}`;
      
      await unifiedLoggingService.logError({
        message: errorMessage,
        component: 'ConnectionStatusService',
        details: { operation: operationName, error: error.message },
      });

      return {
        isValid: false,
        status: this.createDisconnectedStatus(error.message),
        errorMessage: 'เกิดข้อผิดพลาดในการตรวจสอบการเชื่อมต่อ'
      };
    }
  }

  async setupInitialValidation(): Promise<ConnectionStatus> {
    await unifiedLoggingService.logInfo({
      message: 'Setting up initial hardware connection validation',
      component: 'ConnectionStatusService',
      details: {},
    });

    const status = await this.checkConnection();
    
    if (!status.isConnected) {
      await unifiedLoggingService.logWarning({
        message: 'Initial hardware connection validation failed',
        component: 'ConnectionStatusService',
        details: { 
          hardwareType: status.hardwareType,
          error: status.error 
        },
      });
    }

    return status;
  }

  getLastStatus(): ConnectionStatus | null {
    return this.lastStatus;
  }

  isCurrentlyConnected(): boolean {
    return this.lastStatus?.isConnected || false;
  }
}

// Singleton instance for global use
export const connectionStatusService = new ConnectionStatusService();
/**
 * Debug Logger for Activation Flow Timing Analysis
 * 
 * This utility helps track the timing and sequence of events during
 * the activation flow to identify race conditions and timing issues.
 * 
 * Medical Device Context: Critical for ensuring proper state checking
 * after license activation for patient safety.
 */

interface DebugLogEntry {
  timestamp: number;
  isoTimestamp: string;
  component: string;
  event: string;
  data?: any;
  sequenceId: string;
}

class DebugLogger {
  private logs: DebugLogEntry[] = [];
  private sequenceId: string = '';
  private isEnabled: boolean = false;

  constructor() {
    // Enable debug logging in development or when explicitly enabled
    this.isEnabled = process.env.NODE_ENV === 'development' || 
                     localStorage.getItem('smc-debug-activation') === 'true';
  }

  /**
   * Start a new activation flow debug session
   */
  startActivationFlow(): string {
    this.sequenceId = `activation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.logs = [];
    this.log('DebugLogger', 'ACTIVATION_FLOW_STARTED', { sequenceId: this.sequenceId });
    return this.sequenceId;
  }

  /**
   * Log an event with timing information
   */
  log(component: string, event: string, data?: any): void {
    if (!this.isEnabled) return;

    const timestamp = Date.now();
    const isoTimestamp = new Date(timestamp).toISOString();
    
    const entry: DebugLogEntry = {
      timestamp,
      isoTimestamp,
      component,
      event,
      data,
      sequenceId: this.sequenceId
    };

    this.logs.push(entry);
    
    // Also log to console for immediate visibility
    console.log(`[SMC-DEBUG] ${component}:${event}`, {
      time: isoTimestamp,
      sequence: this.sequenceId,
      data
    });
  }

  /**
   * Get all logs for the current session
   */
  getLogs(): DebugLogEntry[] {
    return [...this.logs];
  }

  /**
   * Export logs as JSON string for file writing
   */
  exportLogs(): string {
    const exportData = {
      sequenceId: this.sequenceId,
      exportTimestamp: new Date().toISOString(),
      totalEvents: this.logs.length,
      logs: this.logs
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Save logs to a file (for user to run manually)
   */
  async saveLogsToFile(): Promise<void> {
    if (typeof window !== 'undefined' && window.require) {
      try {
        const { ipcRenderer } = window.require('electron');
        const logsData = this.exportLogs();
        
        await ipcRenderer.invoke('save-debug-logs', {
          filename: `activation-debug-${this.sequenceId}.json`,
          data: logsData
        });
        
        this.log('DebugLogger', 'LOGS_SAVED_TO_FILE', { 
          filename: `activation-debug-${this.sequenceId}.json`,
          totalEvents: this.logs.length 
        });
      } catch (error) {
        console.error('Failed to save debug logs:', error);
      }
    }
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
    this.sequenceId = '';
  }

  /**
   * Enable/disable debug logging
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('smc-debug-activation', enabled.toString());
    }
  }

  /**
   * Get timing analysis between events
   */
  getTimingAnalysis(): any {
    if (this.logs.length < 2) return null;

    const analysis = {
      totalDuration: this.logs[this.logs.length - 1].timestamp - this.logs[0].timestamp,
      eventTimings: [] as any[]
    };

    for (let i = 1; i < this.logs.length; i++) {
      const current = this.logs[i];
      const previous = this.logs[i - 1];
      
      analysis.eventTimings.push({
        from: `${previous.component}:${previous.event}`,
        to: `${current.component}:${current.event}`,
        duration: current.timestamp - previous.timestamp,
        timestamp: current.isoTimestamp
      });
    }

    return analysis;
  }
}

// Create singleton instance
export const debugLogger = new DebugLogger();

// Helper functions for common logging patterns
export const logActivationEvent = (component: string, event: string, data?: any) => {
  debugLogger.log(component, event, data);
};

export const startActivationDebug = () => {
  return debugLogger.startActivationFlow();
};

export const saveActivationLogs = async () => {
  await debugLogger.saveLogsToFile();
};

export const getActivationTimingAnalysis = () => {
  return debugLogger.getTimingAnalysis();
};

// Enable debug logging by default in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  debugLogger.setEnabled(true);
}
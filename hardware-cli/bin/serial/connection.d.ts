/**
 * DS12/DS16 Serial Connection Manager
 * Manages serial communication with DS12/DS16 hardware devices
 *
 * This module provides robust serial connection management
 * with proper error handling and medical device compliance.
 */
import { SerialPort } from "serialport";
import { ParsedResponse } from "../protocol/parser";
export interface ConnectionConfig {
    portPath: string;
    timeout?: number;
    retries?: number;
    existingPort?: SerialPort;
}
export interface SendCommandResult {
    success: boolean;
    response?: ParsedResponse;
    error?: string;
    rawData?: Buffer;
}
export declare class DS12Connection {
    private port;
    private isConnected;
    private portPath;
    private timeout;
    private retries;
    private usingExistingPort;
    constructor(config: ConnectionConfig);
    /**
     * Open connection to DS12/DS16 device
     */
    connect(): Promise<boolean>;
    /**
     * Close connection to DS12/DS16 device
     */
    disconnect(): Promise<void>;
    /**
     * Send command packet and wait for response
     */
    sendCommand(packet: number[]): Promise<SendCommandResult>;
    /**
     * Send a single command attempt
     */
    private sendSingleCommand;
    /**
     * Check if response buffer contains a complete packet
     */
    private isCompleteResponse;
    /**
     * Utility delay function
     */
    private delay;
    /**
     * Check if connection is active
     */
    isConnectionActive(): boolean;
    /**
     * Get connection status information
     */
    getConnectionInfo(): {
        connected: boolean;
        port: string;
        config: any;
    };
}
//# sourceMappingURL=connection.d.ts.map
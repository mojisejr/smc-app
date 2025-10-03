/**
 * DS12/DS16 Port Detection Utility
 * Automatically detects and filters serial ports for DS12/DS16 hardware
 *
 * This module provides intelligent port detection capabilities
 * for identifying DS12/DS16 devices among available serial ports.
 */
import { SerialPort } from "serialport";
export interface DetectedPort {
    path: string;
    manufacturer?: string;
    serialNumber?: string;
    pnpId?: string;
    vendorId?: string;
    productId?: string;
    confidence: "high" | "medium" | "low" | "unknown";
    reason: string;
}
export interface PortDetectionResult {
    success: boolean;
    ports: DetectedPort[];
    error?: string;
    totalPorts: number;
}
/**
 * List all available serial ports
 */
export declare function listAllPorts(): Promise<PortDetectionResult>;
/**
 * Detect DS12/DS16 devices with intelligent filtering
 */
export declare function detectDS12Ports(): Promise<PortDetectionResult>;
/**
 * Test a port to verify if it responds to DS12 commands
 * Returns a connection result with optional port instance for reuse
 */
export declare function testPortConnection(portPath: string, timeout?: number, reuseConnection?: boolean): Promise<{
    success: boolean;
    port?: SerialPort;
}>;
/**
 * Legacy wrapper for backward compatibility
 * @deprecated Use testPortConnection with reuseConnection parameter instead
 */
export declare function testPortConnectionLegacy(portPath: string, timeout?: number): Promise<boolean>;
/**
 * Get the best port candidate for DS12/DS16 connection
 */
export declare function getBestPort(): Promise<DetectedPort | null>;
/**
 * Format port detection results for CLI display
 */
export declare function formatPortList(ports: DetectedPort[]): string;
//# sourceMappingURL=port-detector.d.ts.map
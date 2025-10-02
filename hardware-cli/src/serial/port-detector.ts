/**
 * DS12/DS16 Port Detection Utility
 * Automatically detects and filters serial ports for DS12/DS16 hardware
 * 
 * This module provides intelligent port detection capabilities
 * for identifying DS12/DS16 devices among available serial ports.
 */

import { SerialPort } from 'serialport';
import { PROTOCOL_CONSTANTS, ERROR_MESSAGES } from '../protocol/constants';

export interface DetectedPort {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  vendorId?: string;
  productId?: string;
  confidence: 'high' | 'medium' | 'low' | 'unknown';
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
export async function listAllPorts(): Promise<PortDetectionResult> {
  try {
    const ports = await SerialPort.list();
    
    return {
      success: true,
      ports: ports.map(port => ({
        path: port.path,
        ...(port.manufacturer && { manufacturer: port.manufacturer }),
        ...(port.serialNumber && { serialNumber: port.serialNumber }),
        ...(port.pnpId && { pnpId: port.pnpId }),
        ...(port.vendorId && { vendorId: port.vendorId }),
        ...(port.productId && { productId: port.productId }),
        confidence: 'low' as const,
        reason: 'Listed port without filtering'
      })),
      totalPorts: ports.length
    };
  } catch (error) {
    return {
      success: false,
      ports: [],
      error: `Failed to list ports: ${error}`,
      totalPorts: 0
    };
  }
}

/**
 * Detect DS12/DS16 devices with intelligent filtering
 */
export async function detectDS12Ports(): Promise<PortDetectionResult> {
  try {
    const ports = await SerialPort.list();
    const detectedPorts: DetectedPort[] = [];

    for (const port of ports) {
      const detection = analyzePort(port);
      if (detection) {
        detectedPorts.push(detection);
      }
    }

    // Sort by confidence level
    detectedPorts.sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1, unknown: 0 };
      return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
    });

    return {
      success: true,
      ports: detectedPorts,
      totalPorts: ports.length
    };
  } catch (error) {
    return {
      success: false,
      ports: [],
      error: `${ERROR_MESSAGES.PORT_DETECTION_FAILED}: ${error}`,
      totalPorts: 0
    };
  }
}

/**
 * Analyze a single port to determine if it's likely a DS12/DS16 device
 */
function analyzePort(port: any): DetectedPort | null {
  const path = port.path;
  const manufacturer = port.manufacturer?.toLowerCase() || '';
  const pnpId = port.pnpId?.toLowerCase() || '';
  const vendorId = port.vendorId?.toLowerCase() || '';
  const productId = port.productId?.toLowerCase() || '';

  // High confidence indicators
  if (manufacturer.includes('ftdi') || manufacturer.includes('prolific')) {
    return {
      path,
      ...(port.manufacturer && { manufacturer: port.manufacturer }),
      ...(port.serialNumber && { serialNumber: port.serialNumber }),
      ...(port.pnpId && { pnpId: port.pnpId }),
      ...(port.vendorId && { vendorId: port.vendorId }),
      ...(port.productId && { productId: port.productId }),
      confidence: 'high',
      reason: 'FTDI/Prolific chip detected (common for DS12/DS16)'
    };
  }

  // Medium confidence indicators
  if (pnpId.includes('usb') || vendorId || productId) {
    return {
      path,
      ...(port.manufacturer && { manufacturer: port.manufacturer }),
      ...(port.serialNumber && { serialNumber: port.serialNumber }),
      ...(port.pnpId && { pnpId: port.pnpId }),
      ...(port.vendorId && { vendorId: port.vendorId }),
      ...(port.productId && { productId: port.productId }),
      confidence: 'medium',
      reason: 'USB serial adapter detected'
    };
  }

  // Low confidence - any COM port on Windows
  if (path.startsWith('COM') || path.startsWith('/dev/tty')) {
    return {
      path,
      ...(port.manufacturer && { manufacturer: port.manufacturer }),
      ...(port.serialNumber && { serialNumber: port.serialNumber }),
      ...(port.pnpId && { pnpId: port.pnpId }),
      ...(port.vendorId && { vendorId: port.vendorId }),
      ...(port.productId && { productId: port.productId }),
      confidence: 'low',
      reason: 'Generic serial port'
    };
  }

  return null;
}

/**
 * Test a port to verify if it responds to DS12 commands
 */
export async function testPortConnection(portPath: string, timeout: number = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    let port: SerialPort | null = null;
    let timeoutId: NodeJS.Timeout;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (port && port.isOpen) {
        port.close();
      }
    };

    try {
      port = new SerialPort({
        path: portPath,
        baudRate: PROTOCOL_CONSTANTS.SERIAL_CONFIG.BAUD_RATE,
        dataBits: PROTOCOL_CONSTANTS.SERIAL_CONFIG.DATA_BITS,
        stopBits: PROTOCOL_CONSTANTS.SERIAL_CONFIG.STOP_BITS,
        parity: PROTOCOL_CONSTANTS.SERIAL_CONFIG.PARITY,
        autoOpen: false
      });

      // Set timeout
      timeoutId = setTimeout(() => {
        cleanup();
        resolve(false);
      }, timeout);

      port.open((err) => {
        if (err) {
          cleanup();
          resolve(false);
          return;
        }

        // Port opened successfully - this is a good sign
        cleanup();
        resolve(true);
      });

    } catch (error) {
      cleanup();
      resolve(false);
    }
  });
}

/**
 * Get the best port candidate for DS12/DS16 connection
 */
export async function getBestPort(): Promise<DetectedPort | null> {
  const result = await detectDS12Ports();
  
  if (!result.success || result.ports.length === 0) {
    return null;
  }

  // Return the highest confidence port
  return result.ports[0];
}

/**
 * Format port detection results for CLI display
 */
export function formatPortList(ports: DetectedPort[]): string {
  if (ports.length === 0) {
    return 'ไม่พบพอร์ตที่เหมาะสม';
  }

  let output = `พบพอร์ตที่เป็นไปได้ ${ports.length} พอร์ต:\n\n`;
  
  ports.forEach((port, index) => {
    const confidenceIcon = {
      high: '🟢',
      medium: '🟡', 
      low: '🔴',
      unknown: '⚪'
    }[port.confidence];

    output += `${index + 1}. ${port.path} ${confidenceIcon}\n`;
    output += `   ความเชื่อมั่น: ${port.confidence}\n`;
    output += `   เหตุผล: ${port.reason}\n`;
    
    if (port.manufacturer) {
      output += `   ผู้ผลิต: ${port.manufacturer}\n`;
    }
    
    if (port.serialNumber) {
      output += `   Serial: ${port.serialNumber}\n`;
    }
    
    output += '\n';
  });

  return output;
}
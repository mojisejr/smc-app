"use strict";
/**
 * DS12/DS16 Serial Connection Manager
 * Manages serial communication with DS12/DS16 hardware devices
 *
 * This module provides robust serial connection management
 * with proper error handling and medical device compliance.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DS12Connection = void 0;
const serialport_1 = require("serialport");
const constants_1 = require("../protocol/constants");
const parser_1 = require("../protocol/parser");
class DS12Connection {
    constructor(config) {
        this.port = null;
        this.isConnected = false;
        this.usingExistingPort = false;
        this.portPath = config.portPath;
        this.timeout = config.timeout || constants_1.PROTOCOL_CONSTANTS.COMMUNICATION_TIMEOUT;
        this.retries = config.retries || 3;
        // If an existing port is provided, use it
        if (config.existingPort) {
            this.port = config.existingPort;
            this.usingExistingPort = true;
            this.isConnected = config.existingPort.isOpen;
        }
    }
    /**
     * Open connection to DS12/DS16 device
     */
    async connect() {
        try {
            if (this.isConnected && this.port?.isOpen) {
                return true;
            }
            // If using an existing port, just verify it's open
            if (this.usingExistingPort && this.port) {
                if (this.port.isOpen) {
                    this.isConnected = true;
                    return true;
                }
                else {
                    throw new Error(`${constants_1.ERROR_MESSAGES.CONNECTION_FAILED}: Existing port is not open`);
                }
            }
            // Create new port connection
            this.port = new serialport_1.SerialPort({
                path: this.portPath,
                baudRate: constants_1.PROTOCOL_CONSTANTS.SERIAL_CONFIG.BAUD_RATE,
                dataBits: constants_1.PROTOCOL_CONSTANTS.SERIAL_CONFIG.DATA_BITS,
                stopBits: constants_1.PROTOCOL_CONSTANTS.SERIAL_CONFIG.STOP_BITS,
                parity: constants_1.PROTOCOL_CONSTANTS.SERIAL_CONFIG.PARITY,
                autoOpen: false,
            });
            return new Promise((resolve, reject) => {
                this.port.open((err) => {
                    if (err) {
                        reject(new Error(`${constants_1.ERROR_MESSAGES.CONNECTION_FAILED}: ${err.message}`));
                        return;
                    }
                    this.isConnected = true;
                    resolve(true);
                });
            });
        }
        catch (error) {
            throw new Error(`${constants_1.ERROR_MESSAGES.CONNECTION_FAILED}: ${error}`);
        }
    }
    /**
     * Close connection to DS12/DS16 device
     */
    async disconnect() {
        // If using an existing port, don't close it - let the caller handle it
        if (this.usingExistingPort) {
            this.isConnected = false;
            // Don't set port to null since we don't own it
            return;
        }
        if (this.port && this.port.isOpen) {
            return new Promise((resolve, reject) => {
                this.port.close((err) => {
                    if (err) {
                        reject(new Error(`Failed to close connection: ${err.message}`));
                        return;
                    }
                    this.isConnected = false;
                    this.port = null;
                    resolve();
                });
            });
        }
        this.isConnected = false;
        this.port = null;
    }
    /**
     * Send command packet and wait for response
     */
    async sendCommand(packet) {
        if (!this.isConnected || !this.port) {
            return {
                success: false,
                error: constants_1.ERROR_MESSAGES.NOT_CONNECTED,
            };
        }
        let attempt = 0;
        while (attempt < this.retries) {
            try {
                const result = await this.sendSingleCommand(packet);
                if (result.success) {
                    return result;
                }
                attempt++;
                // Wait before retry
                if (attempt < this.retries) {
                    await this.delay(500);
                }
            }
            catch (error) {
                attempt++;
                if (attempt >= this.retries) {
                    return {
                        success: false,
                        error: `${constants_1.ERROR_MESSAGES.COMMUNICATION_TIMEOUT}: ${error}`,
                    };
                }
                await this.delay(500);
            }
        }
        return {
            success: false,
            error: `${constants_1.ERROR_MESSAGES.COMMUNICATION_TIMEOUT} after ${this.retries} attempts`,
        };
    }
    /**
     * Send a single command attempt
     */
    async sendSingleCommand(packet) {
        return new Promise((resolve) => {
            if (!this.port) {
                resolve({
                    success: false,
                    error: constants_1.ERROR_MESSAGES.NOT_CONNECTED,
                });
                return;
            }
            const buffer = Buffer.from(packet);
            let responseBuffer = Buffer.alloc(0);
            let timeoutId;
            // Set up timeout
            timeoutId = setTimeout(() => {
                this.port.removeAllListeners("data");
                resolve({
                    success: false,
                    error: constants_1.ERROR_MESSAGES.COMMUNICATION_TIMEOUT,
                });
            }, this.timeout);
            // Set up data listener
            const onData = (data) => {
                responseBuffer = Buffer.concat([responseBuffer, data]);
                // Check if we have a complete response
                if (this.isCompleteResponse(responseBuffer)) {
                    clearTimeout(timeoutId);
                    this.port.removeAllListeners("data");
                    const parsedResponse = (0, parser_1.parseResponse)(responseBuffer);
                    resolve({
                        success: parsedResponse.success,
                        response: parsedResponse,
                        rawData: responseBuffer,
                        ...(parsedResponse.error && { error: parsedResponse.error }),
                    });
                }
            };
            this.port.on("data", onData);
            // Send the command
            this.port.write(buffer, (err) => {
                if (err) {
                    clearTimeout(timeoutId);
                    this.port.removeAllListeners("data");
                    resolve({
                        success: false,
                        error: `Write error: ${err.message}`,
                    });
                }
            });
        });
    }
    /**
     * Check if response buffer contains a complete packet
     */
    isCompleteResponse(buffer) {
        if (buffer.length < 8) {
            return false;
        }
        // Check for frame start
        if (buffer[0] !== constants_1.PROTOCOL_CONSTANTS.FRAME_START) {
            return false;
        }
        // Check if we have enough data for the packet
        if (buffer.length >= 6) {
            const dataLen = buffer[constants_1.PROTOCOL_CONSTANTS.PACKET_POS.DATALEN];
            const expectedLength = 8 + dataLen; // Header + data + checksum + frame end
            if (buffer.length >= expectedLength) {
                // Check for frame end
                const frameEndPos = expectedLength - 1;
                return buffer[frameEndPos] === constants_1.PROTOCOL_CONSTANTS.FRAME_END;
            }
        }
        return false;
    }
    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Check if connection is active
     */
    isConnectionActive() {
        return this.isConnected && this.port?.isOpen === true;
    }
    /**
     * Get connection status information
     */
    getConnectionInfo() {
        return {
            connected: this.isConnected,
            port: this.portPath,
            config: {
                baudRate: constants_1.PROTOCOL_CONSTANTS.SERIAL_CONFIG.BAUD_RATE,
                dataBits: constants_1.PROTOCOL_CONSTANTS.SERIAL_CONFIG.DATA_BITS,
                stopBits: constants_1.PROTOCOL_CONSTANTS.SERIAL_CONFIG.STOP_BITS,
                parity: constants_1.PROTOCOL_CONSTANTS.SERIAL_CONFIG.PARITY,
                timeout: this.timeout,
                retries: this.retries,
            },
        };
    }
}
exports.DS12Connection = DS12Connection;
//# sourceMappingURL=connection.js.map
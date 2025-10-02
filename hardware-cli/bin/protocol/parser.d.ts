/**
 * DS12/DS16 Response Parser
 * Parses hardware responses and extracts meaningful data
 *
 * This module provides independent response parsing capabilities
 * for interpreting DS12/DS16 hardware communication.
 */
export interface SlotState {
    slotNumber: number;
    isOpen: boolean;
    status: 'open' | 'closed' | 'unknown';
}
export interface ParsedResponse {
    success: boolean;
    command: number;
    ask: number;
    data?: number[];
    error?: string;
    slotStates?: SlotState[];
    message?: string;
}
/**
 * Parse raw response buffer from DS12/DS16 hardware
 */
export declare function parseResponse(buffer: Buffer): ParsedResponse;
/**
 * Format slot states for human-readable output
 */
export declare function formatSlotStates(slotStates: SlotState[]): string;
//# sourceMappingURL=parser.d.ts.map
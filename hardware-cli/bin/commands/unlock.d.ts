/**
 * Unlock Command
 * Unlocks specific DS12/DS16 slots using raw 0x81 command
 */
export interface UnlockOptions {
    port?: string;
    timeout?: number;
    verbose?: boolean;
    force?: boolean;
}
export declare function unlockCommand(slotNumber: string, options?: UnlockOptions): Promise<void>;
//# sourceMappingURL=unlock.d.ts.map
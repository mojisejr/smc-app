/**
 * Check State Command
 * Checks DS12/DS16 slot states using raw 0x80 command
 */
export interface CheckStateOptions {
    port?: string;
    timeout?: number;
    verbose?: boolean;
}
export declare function checkStateCommand(options?: CheckStateOptions): Promise<void>;
//# sourceMappingURL=check-state.d.ts.map
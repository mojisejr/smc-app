/**
 * List Ports Command
 * Lists available serial ports with DS12/DS16 detection
 */
export interface ListPortsOptions {
    all?: boolean;
    verbose?: boolean;
}
export declare function listPortsCommand(options?: ListPortsOptions): Promise<void>;
//# sourceMappingURL=list-ports.d.ts.map
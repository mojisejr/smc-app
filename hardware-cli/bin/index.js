"use strict";
/**
 * SMC Hardware CLI - Main Module Exports
 *
 * This module provides programmatic access to DS12/DS16 hardware
 * control functions for integration with other applications.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Protocol exports
__exportStar(require("./protocol/constants"), exports);
__exportStar(require("./protocol/packet-builder"), exports);
__exportStar(require("./protocol/parser"), exports);
// Serial communication exports
__exportStar(require("./serial/connection"), exports);
__exportStar(require("./serial/port-detector"), exports);
// Command exports
__exportStar(require("./commands/list-ports"), exports);
__exportStar(require("./commands/check-state"), exports);
__exportStar(require("./commands/unlock"), exports);
// Main CLI export (programmatic access)
__exportStar(require("./cli"), exports);
//# sourceMappingURL=index.js.map
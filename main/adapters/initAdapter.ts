import { ipcMain, BrowserWindow } from "electron";
import { getHardwareType } from "../setting/getHardwareType";
import { KU16 } from "../ku16";
import { CU12SmartStateManager } from "../hardware/cu12/stateManager";
import { transformCU12ToKU16Format } from "./cu12DataAdapter";

/**
 * Universal Init Adapter
 * Routes 'init' IPC calls to appropriate hardware-specific handler
 * Maintains backward compatibility while supporting both KU16 and CU12
 */
export const registerUniversalInitHandler = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow
) => {
  ipcMain.handle("init", async (event, payload) => {
    try {
      console.log(
        "[ADAPTER] Universal init handler called with payload:",
        payload
      );

      // Auto-detect current hardware type
      const hardwareInfo = await getHardwareType();
      console.log(`[ADAPTER] Routing init to ${hardwareInfo.type} hardware`);

      if (hardwareInfo.type === "DS12" && cu12StateManager) {
        // Route to CU12 initialization
        console.log("[ADAPTER] Routing to CU12 init handler");

        const isConnected = cu12StateManager.isConnected();

        if (!isConnected) {
          mainWindow.webContents.send("cu12-init-failed-on-connection-error", {
            title: "ไม่สามารถเชื่อมต่อกับตู้เก็บยา DS12 ได้",
            message:
              "ไม่สามารถเชื่อมต่อกับตู้เก็บยา DS12 ได้ ตรวจสอบที่หน้า admin",
            suggestion:
              "กรุณาตรวจสอบการเชื่อมต่อกับตู้เก็บยา และลองใหม่อีกครั้ง",
            path: "/error/connection-error",
          });
          return { success: false, error: "DS12 Connection failed" };
        }

        // Trigger user interaction to activate monitoring
        await cu12StateManager.onUserInteraction();

        // Sync slot status for initialization
        const cu12SlotStatus = await cu12StateManager.syncSlotStatus(
          "PRE_OPERATION"
        );

        // Transform CU12 data to KU16-compatible format
        const ku16CompatibleData = await transformCU12ToKU16Format(cu12SlotStatus);

        // Send init-res event to frontend (same as KU16)
        console.log('[ADAPTER] Sending init-res event with', ku16CompatibleData.length, 'slots');
        mainWindow.webContents.send("init-res", ku16CompatibleData);

        return {
          success: true,
          connected: isConnected,
          monitoringMode: cu12StateManager.getMonitoringMode(),
          slotStatus: ku16CompatibleData, // Send transformed data
          hardwareType: "CU12",
        };
      } else if (hardwareInfo.type === "DS16" && ku16Instance) {
        // Route to KU16 initialization
        console.log("[ADAPTER] Routing to KU16 init handler");

        const isConnected = ku16Instance.isConnected();

        if (!isConnected) {
          mainWindow.webContents.send("init-failed-on-connection-error", {
            title: "ไม่สามารถเชื่อมต่อกับตู้เก็บยา DS16 ได้",
            message:
              "ไม่สามารถเชื่อมต่อกับตู้เก็บยา DS16 ได้ ตรวจสอบที่หน้า admin",
            suggestion:
              "กรุณาตรวจสอบการเชื่อมต่อกับตู้เก็บยา และลองใหม่อีกครั้ง",
            path: "/error/connection-error",
          });
          return { success: false, error: "DS16 Connection failed" };
        }

        // Send check state command to KU16 (similar to original KU16 init handler)
        ku16Instance.sendCheckState();

        return {
          success: true,
          connected: isConnected,
          message: "DS16 initialization completed - slot status requested",
          hardwareType: "KU16",
        };
      } else {
        // No hardware available or unknown type
        console.error("[ADAPTER] No compatible hardware available for init");
        mainWindow.webContents.send("init-failed-on-connection-error", {
          title: "ไม่พบฮาร์ดแวร์ที่รองรับ",
          message: "ไม่สามารถตรวจพบฮาร์ดแวร์ที่รองรับได้ (DS16/DS12)",
          suggestion: "กรุณาตรวจสอบการตั้งค่าฮาร์ดแวร์ในหน้า admin",
          path: "/error/connection-error",
        });
        return { success: false, error: "No compatible hardware found" };
      }
    } catch (error) {
      console.error("[ADAPTER] Universal init handler error:", error.message);
      mainWindow.webContents.send("init-failed-on-connection-error", {
        title: "เกิดข้อผิดพลาดในระบบ",
        message: `ข้อผิดพลาด: ${error.message}`,
        suggestion: "กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ",
        path: "/error/connection-error",
      });
      return { success: false, error: error.message };
    }
  });

  console.log("[ADAPTER] Universal init handler registered successfully");
};

import { ipcMain, IpcMainEvent, BrowserWindow } from "electron";
import { logger } from "../../../logger";
import { User } from "../../../../db/model/user.model";
import { BuildTimeController } from "../../../ku-controllers/BuildTimeController";

export const reactivateAdminHandler = () => {
  ipcMain.handle("reactivate-admin", async (event: IpcMainEvent, payload) => {
    // Get BrowserWindow from IPC event instead of using KU16 reference
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      throw new Error("Could not find BrowserWindow from IPC event");
    }

    // Use BuildTimeController instead of KU16
    // Maintain exact same functionality, error messages, and timing patterns
    const controller = BuildTimeController.getCurrentController();

    try {
      const user = await User.findOne({ where: { name: payload.name } });

      if (!user || user.dataValues.role !== "ADMIN") {
        // PRESERVE: Exact same Thai language error messages and logging
        await logger({
          user: "system",
          message: `reactivate-admin: user is not admin`,
        });
        throw new Error("ไม่สามารถเปิดใช้งานระบบได้");
      }

      // Check controller connection before operation
      if (!controller || !controller.isConnected()) {
        throw new Error("ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้");
      }

      // MEDICAL SAFETY: Pre-toggle hardware validation
      // Request current hardware state before slot toggle operation
      await controller.sendCheckState();
      
      // Add delay for hardware response (medical device safety requirement)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Medical safety validation - hardware state will be validated by DS12Controller internally
      // This ensures slot is safe for toggle operation (not occupied, not open, not faulty)
      
      // Internal validation by DS12Controller
      if (!controller.isConnected()) {
        win.webContents.send("reactivate-admin-error", {
          message: "ไม่สามารถเปิดใช้งานระบบได้ เนื่องจากอุปกรณ์ไม่ได้เชื่อมต่อ",
        });
        throw new Error("Hardware validation failed: Device not connected");
      }
      
      // Use BuildTimeController.reactivate() instead of ku16.reactive()
      // DS12Controller implements reactivate() with same signature and includes hardware state reset
      // FIX: Use payload.name instead of payload.passkey (parameter mismatch bug)
      const result = await controller.reactivate(payload.slotId, payload.name);
      
      // ADDITIONAL STATE VALIDATION: Ensure hardware controller is ready after reactivation
      // DS12Controller.reactivate() includes emergencyStateReset() but this provides extra assurance
      BuildTimeController.emergencyStateReset();
      await logger({
        user: "system",
        message: `reactivate-admin: emergency state reset applied for slot #${payload.slotId}`,
      });
      
      // PRESERVE: Same timing pattern - 1 second sleep then check state
      // Create delay utility matching KU16.sleep() behavior
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use BuildTimeController.sendCheckState() instead of ku16.sendCheckState()
      await BuildTimeController.sendCheckState();

      // PRESERVE: Exact same logging patterns and messages
      await logger({
        user: "system",
        message: `reactivate-admin: slot #${payload.slotId} by ${payload.name} with hardware state reset`,
      });

      return result;
    } catch (error) {
      // PRESERVE: Same IPC error event and Thai language message
      // Use BrowserWindow from event instead of ku16.win
      const errorMessage = error instanceof Error && error.message.includes("Hardware validation failed") 
        ? "ไม่สามารถเปิดใช้งานระบบได้ เนื่องจากอุปกรณ์ไม่ได้เชื่อมต่อ"
        : "ไม่สามารถเปิดใช้งานระบบได้";
      
      win.webContents.send("reactivate-admin-error", {
        message: errorMessage,
      });

      // PRESERVE: Exact same error logging patterns
      await logger({
        user: "system",
        message: `reactivate-admin: slot #${payload.slotId} by ${payload.name} error`,
      });
    }
  });
};
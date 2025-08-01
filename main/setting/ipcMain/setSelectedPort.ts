import { ipcMain } from "electron";
import { Setting } from "../../../db/model/setting.model";
import { User } from "../../../db/model/user.model";
import { getHardwareType } from "../getHardwareType";

export const setSelectedPortHandler = () => {
  ipcMain.handle("set-selected-port", async (event, payload) => {
    try {
      const admin = await User.findOne({ where: { name: payload.admin } });
      if (admin.dataValues.role !== "ADMIN") {
        throw new Error("คุณไม่มีสิทธิในการเปลี่ยน port");
      }

      // Get current hardware type to determine which port field to update
      const hardwareInfo = await getHardwareType();
      const updateFields: any = {};

      if (hardwareInfo.type === "CU12") {
        updateFields.cu_port = payload.port;
      } else if (hardwareInfo.type === "KU16") {
        updateFields.ku_port = payload.port;
      } else {
        // Auto mode - default to KU16 for backward compatibility
        updateFields.ku_port = payload.port;
      }

      await Setting.update(updateFields, { where: { id: 1 } });

      return { 
        success: true, 
        message: `เปลี่ยน ${hardwareInfo.type} port เรียบร้อย`,
        hardwareType: hardwareInfo.type,
        updatedPort: payload.port
      };
    } catch (error) {
      return { 
        success: false, 
        message: "เกิดข้อผิดพลาด",
        error: error.message
      };
    }
  });
};

export const setSelectedIndicatorPortHandler = () => {
  ipcMain.handle("set-indicator-port", async (event, payload) => {
    try {
      const admin = await User.findOne({ where: { name: payload.admin } });
      if (admin.dataValues.role !== "ADMIN") {
        throw new Error("คุณไม่มีสิทธิในการเปลี่ยน port");
      }

      await Setting.update({ indi_port: payload.port }, { where: { id: 1 } });

      return { success: true, message: "เปลี่ยน indicator port เรียบร้อย" };
    } catch (error) {
      return { success: false, message: "เกิดข้อผิดพลาด" };
    }
  });
};

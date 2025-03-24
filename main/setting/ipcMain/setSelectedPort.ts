import { ipcMain } from "electron";
import { Setting } from "../../../db/model/setting.model";
import { User } from "../../../db/model/user.model";

export const setSelectedPortHandler = () => {
  ipcMain.handle("set-selected-port", async (event, payload) => {
    try {
      const admin = await User.findOne({ where: { name: payload.admin } });
      if (admin.dataValues.role !== "ADMIN") {
        throw new Error("คุณไม่มีสิทธิในการเปลี่ยน port");
      }

      await Setting.update({ ku_port: payload.port }, { where: { id: 1 } });

      return { success: true, message: "เปลี่ยน port เรียบร้อย" };
    } catch (error) {
      return { success: false, message: "เกิดข้อผิดพลาด" };
    }
  });
};

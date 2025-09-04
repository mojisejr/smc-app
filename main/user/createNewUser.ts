import { ipcMain } from "electron";
import { User } from "../../db/model/user.model";

export const createNewUserHandler = () => {
  ipcMain.handle("create-new-user", async (event, payload) => {
    try {
      const admin = await User.findOne({ where: { name: payload.admin } });
      if (admin.dataValues.role !== "ADMIN") {
        throw new Error("คุณไม่มีสิทธิในการเพิ่มผู้ใช้งาน");
      }

      const user = await User.findOne({ where: { name: payload.name } });
      if (user) {
        throw new Error("ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว");
      }

      await User.create({
        name: payload.name,
        passkey: payload.passkey,
        role: "USER",
      });

      return {
        success: true,
        message: "สร้างผู้ใช้งานเรียบร้อย",
      };
    } catch (error) {
      return {
        success: false,
        message: "เกิดข้อผิดพลาด",
      };
    }
  });
};

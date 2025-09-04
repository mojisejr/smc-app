import { ipcMain } from "electron";
import { User } from "../../db/model/user.model";

export const deleteUserHandler = () => {
  ipcMain.handle("delete-user", async (event, payload) => {
    try {
      const admin = await User.findOne({ where: { name: payload.admin } });

      if (admin.dataValues.role !== "ADMIN") {
        throw new Error("คุณไม่มีสิทธิในการลบผู้ใช้งาน");
      }

      await User.destroy({ where: { id: payload.id } });
      return { success: true, message: "ลบผู้ใช้งานเรียบร้อย" };
    } catch (error) {
      return { success: false, message: "เกิดข้อผิดพลาด" };
    }
  });
};

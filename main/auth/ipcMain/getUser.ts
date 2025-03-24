import { BrowserWindow, ipcMain } from "electron";
import { User } from "../../../db/model/user.model";

export const getUserHandler = async (win: BrowserWindow) => {
  try {
    ipcMain.handle("get-user", async (event, args) => {
      const result = await User.findAll();
      const users = result.map((user) => ({
        id: user.dataValues.id,
        name: user.dataValues.name,
        role: user.dataValues.role,
      }));
      return users;
    });
  } catch (error) {
    console.log(error);
  }
};

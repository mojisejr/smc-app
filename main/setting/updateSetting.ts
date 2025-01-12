import { IUpdateSetting } from "../interfaces/setting";
import { Setting } from "../../db/model/setting.model";


export async function updateSetting(setting: IUpdateSetting) {


    const settingInstance = await Setting.findOne({ where: { id: 1 } });
    if (!settingInstance) {
        throw new Error("Setting not found");
    }


    await settingInstance.update(setting, { where: { id: 1 } });
    return settingInstance;

}
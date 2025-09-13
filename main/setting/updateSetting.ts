import { IUpdateSetting } from "../interfaces/setting";
import { Setting } from "../../db/model/setting.model";


export async function updateSetting(setting: IUpdateSetting) {
    try {
        const settingInstance = await Setting.findOne({ where: { id: 1 } });
        if (!settingInstance) {
            throw new Error("Setting not found - Medical device configuration missing");
        }

        // Fix: Remove invalid where clause from instance update
        // Instance update doesn't require where clause as it operates on the specific instance
        await settingInstance.update(setting);
        
        // Reload to get updated values for medical device audit trail
        await settingInstance.reload();
        
        return settingInstance;
    } catch (error) {
        console.error('[MEDICAL-DEVICE] Setting update failed:', error);
        throw error;
    }
}
import { Setting } from "../../db/model/setting.model";
import { ISetting } from "../interfaces/setting";

export async function getSetting (): Promise<ISetting | null> { 
    try {
        const settingRecord = await Setting.findOne({ where: { id: 1 } });
        
        if (!settingRecord) {
            console.warn('[getSetting] No settings found with id: 1');
            return null;
        }
        
        const settings = settingRecord.dataValues as ISetting;
        return settings;
    } catch (error) {
        console.error('[getSetting] Error retrieving settings:', error);
        throw error;
    }
}

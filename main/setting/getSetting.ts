import { Setting } from "../../db/model/setting.model";
import { ISetting } from "../interfaces/setting";

export async function getSetting () { 
    const settings = (await Setting.findOne({ where: { id: 1 } })).dataValues as ISetting;
    return settings
}

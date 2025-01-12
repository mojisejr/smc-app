import { useState, useEffect } from "react";
import { ISetting, IUpdateSetting } from "../interfaces/setting";
import { ipcRenderer } from "electron";

export function useSetting () {
    const [setting, setSetting] = useState<ISetting>();
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        getSetting()
        updateSettingResponse()

        return () => {
            ipcRenderer.removeAllListeners("get-setting");
            ipcRenderer.removeAllListeners("set-setting-res");
        }
    }, [])

    const getSetting = () => {
        setLoading(true);
        ipcRenderer.invoke("get-setting");
    }

    const updateSetting = (setting: IUpdateSetting) => {
        setLoading(true);
        ipcRenderer.invoke("set-setting", setting);
    }

    const updateSettingResponse = () => {
        ipcRenderer.on("get-setting-res", (event, payload: ISetting) => {
            setLoading(false)
            setSetting(payload);
        });
    }

    return {
        loading,
        setting,
        updateSetting
    }
}
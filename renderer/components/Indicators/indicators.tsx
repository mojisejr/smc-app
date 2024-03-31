import { useEffect, useState } from "react";
import Indicator from "./baseIndicator"
import { ipcRenderer } from "electron";
import Loading from "../Shared/Loading";
import BatteryIndicator from "./batteryIndicator";
import { LargeNumberLike } from "crypto";

/**
 * {"Temp1":25.9,"Temp2":0,"Huminity1":43,"Huminity2":0,"Battery":15,"temp1":25.9,"temp2":43,"percent_batt":64}
 */

export interface SensorData {
    Temp1?: number;
    Temp2?: number;
    Huminity1?: number;
    Huminity2?: number;
    Bettery?: number;
    percent_batt?: number;
}


const Indicators = () => {
    const [sensors, setSensors ] = useState<SensorData>();
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        setLoading(true);
        ipcRenderer.on("get_sensors", (event,payload) => {
            if(payload != undefined) {
                //console.log(payload)
                setLoading(false);
                setSensors(payload);
            }
        });
    }, []);

    return(
    <>
{/*<div className="flex flex-col gap-4">	
    	<BatteryIndicator level={95} />
   	<Indicator title="temp." value={28} unit="*c" />
    	<Indicator title="humid." value={62} unit="%" />
</div>*/}
   { loading && sensors == undefined ? <Loading /> :  <>
    	<BatteryIndicator level={+sensors?.percent_batt} />
   	<Indicator title="temp." value={+sensors?.Temp1 ?? 0} unit="*c" />
    	<Indicator title="humid." value={+sensors?.Huminity1 ?? 0} unit="%" />
    </>} 
    </>
    )
}

export default Indicators;

import { useEffect, useState } from "react";
import Indicator from "./baseIndicator"
import { ipcRenderer } from "electron";
import Loading from "../Shared/Loading";
import BatteryIndicator from "./batteryIndicator";

export interface SensorData {
    site?: string;
    data?: {
        p00?: Sensor,
        p01?: Sensor
    };
    v_batt?: number;
    percent_batt?: number;

}

interface Sensor {
    temp?: string;
    humid?: string;
    ir?: string;
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
   	<Indicator title="temp." value={+sensors?.data.p00.temp ?? 0} unit="*c" />
    	<Indicator title="humid." value={+sensors?.data.p00.humid ?? 0} unit="%" />
    </>} 
    </>
    )
}

export default Indicators;

import { useEffect, useState } from "react";
import Indicator from "./baseIndicator";
import { ipcRenderer } from "electron";
import Loading from "../Shared/Loading";
import { useIndicator } from "../../hooks/useIndicator";
import BatteryIndicator from "./batteryIndicator";

/**
 * {"Temp1":25.9,"Temp2":0,"Huminity1":43,"Huminity2":0,"Battery":15,"temp1":25.9,"temp2":43,"percent_batt":64}
 */

export interface SensorData {
  Temp1?: number;
  Temp2?: number;
  Huminity1?: number;
  Huminity2?: number;
  Bettery?: number;
}

const Indicators = () => {
  const { indicator } = useIndicator();

  return (
    <>
      {!indicator ? (
        <Loading />
      ) : (
        <div>
          <div className="text-sm font-semibold text-start px-2">
            Indicators
          </div>
          <div className="grid grid-cols-2 gap-2 bg-gray-800 p-6 rounded-xl">
            <Indicator
              title="Temp."
              value={indicator.data.Temp1}
              threshold={40}
              unit="*c"
            />
            <Indicator
              title="%RH"
              value={indicator.data.Huminity1}
              threshold={85}
              unit="%"
            />
            {/* <Indicator
              title="temp2."
              value={indicator.data.Temp2}
              threshold={40}
              unit="*c"
            />
            <Indicator
              title="humid2."
              threshold={85}
              value={indicator.data.Huminity2}
              unit="%"
            /> */}
            <div className="w-full flex justify-center col-span-2">
              <BatteryIndicator level={100} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Indicators;

import { useState, useEffect } from "react";

interface BatteryIndicatorProps {
  level?: number;
}

const BatteryIndicator = ({ level = 19 }: BatteryIndicatorProps) => {
  const [bg, setBg] = useState<string>("#73AD21");

  useEffect(() => {
    if (level > 40) {
      setBg("#73AD21");
    } else if (level < 40 && level >= 20) {
      setBg("#ffcc00");
    } else if (level < 20) {
      setBg("#ff0000");
    } else {
      setBg("#73AD21");
    }
  }, [level]);

  return (
    <div className="batteryContainer">
      <div className="batteryOuter">
        <div
          className="batteryLevel"
          style={{ width: `${level}%`, backgroundColor: `${bg}` }}
        ></div>
        <p className="text-xs py-1">{level}%</p>
      </div>
      <div className="batteryBump"></div>
    </div>
  );
};

export default BatteryIndicator;

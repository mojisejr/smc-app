import { FaLock } from "react-icons/fa";
import Indicator from "../Indicators/baseIndicator";
interface EmptySlotProps {
  slotNo: number;
  isActive: boolean;
  temp: number;
  humid: number;
}
export const EmptySlot = ({
  slotNo,
  isActive,
  temp = 0,
  humid = 0,
}: EmptySlotProps) => {
  return (
    <div
      className={`relative min-w-[170px] min-h-[175px] transition-all duration-300 ease-in-out ${
        isActive 
          ? "bg-blue-50/80 backdrop-blur-sm border border-blue-100/50 shadow-lg" 
          : "bg-gray-100/60 backdrop-blur-sm border border-gray-200/30 opacity-50 shadow-md"
      } rounded-xl p-3`}
    >
      <div className="flex justify-between ">
        <FaLock className="fill-blue-600 transition-colors duration-200" size={20} />
      </div>
      <div className="flex flex-col justify-center items-center pt-3 min-h-[100px]">
        <div className="font-semibold text-blue-700 tracking-wide">ปลดล็อค</div>
      </div>
      <div className="absolute bottom-0 right-0 w-full flex justify-between px-3 py-1">
        {isActive ? (
          <div className="flex gap-1 text-xs text-gray-500 items-center">
            <span className="flex items-center gap-1">
              <span>🌡️</span>
              <span>{temp}°C</span>
            </span>
            <span className="flex items-center gap-1">
              <span>💧</span>
              <span>{humid}%</span>
            </span>
          </div>
        ) : (
          <div></div>
        )}
        <div className="text-blue-700 text-[40px] font-bold">{slotNo}</div>
      </div>
    </div>
  );
};

export default EmptySlot;

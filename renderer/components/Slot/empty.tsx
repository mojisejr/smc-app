import { FaLock } from "react-icons/fa";
import Indicator from "../Indicators/baseIndicator";
import { getSlotStylingConfig } from "../../utils/getDisplaySlotConfig";
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
  // Get responsive styling configuration
  const { slotSizeClass, slotNumberClass, paddingClass, indicatorSpacing } = getSlotStylingConfig();
  return (
    <div className={`relative ${slotSizeClass}`}>
      {/* Slot Content - Consistent structure with locked slot */}
      <div
        className={`relative w-full h-full ${
          isActive ? "bg-[#F6F6F6]" : "bg-[#eee] opacity-30"
        } shadow-xl rounded-xl ${paddingClass} cursor-default overflow-hidden`}
      >
        <div className="flex justify-between">
          <FaLock className="fill-[#F9324A] w-4 h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6 2xl:w-7 2xl:h-7" />
        </div>
        <div className="flex flex-col pt-2 lg:pt-3 xl:pt-4 justify-center items-center min-h-[50px] lg:min-h-[55px] xl:min-h-[60px] 2xl:min-h-[65px]">
          <div className="font-bold text-sm lg:text-base xl:text-lg 2xl:text-xl">ปลดล็อค</div>
        </div>
        <div className="flex flex-col leading-4 pt-1 lg:pt-2 px-1 items-start">
          <div className="flex justify-between w-full px-1 lg:px-2">
            <div className="text-transparent">.</div> {/* Spacer for layout consistency */}
            <div className="text-transparent">.</div> {/* Spacer for layout consistency */}
          </div>
          <div className={`flex w-full ${indicatorSpacing}`}>
            {isActive ? (
              <>
                <Indicator value={temp} unit="*C" title="Temp." threshold={50} />
                <Indicator value={humid} unit="%" title="%RH" threshold={85} />
              </>
            ) : (
              <div className="opacity-30">
                <Indicator value={0} unit="*C" title="Temp." threshold={50} />
                <Indicator value={0} unit="%" title="%RH" threshold={85} />
              </div>
            )}
          </div>
        </div>

        <div className={`absolute bottom-2 right-2 text-[#615858] ${slotNumberClass} font-bold`}>
          {slotNo}
        </div>
      </div>
    </div>
  );
};

export default EmptySlot;

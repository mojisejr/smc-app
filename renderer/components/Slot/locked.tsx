import { useState } from "react";
import { FaLock } from "react-icons/fa";
import { BsArrowClockwise } from "react-icons/bs";
import Modal from "../Modals";
import ResetSlotOrNot from "../Dialogs/ResetSlotOrNot";
import Indicator from "../Indicators/baseIndicator";
import { getSlotStylingConfig } from "../../utils/getDisplaySlotConfig";
interface LockedSlotProps {
  slotNo: number;
  hn: string;
  date: string;
  time: string;
  temp: number;
  humid: number;
}

export const LockedSlot = ({
  slotNo,
  hn,
  date,
  time,
  temp,
  humid,
}: LockedSlotProps) => {
  const [bg, setBg] = useState<string>("bg-[#F6F6F6]");
  const [openReset, setOpenReset] = useState<boolean>(false);

  // Get responsive styling configuration
  const { slotSizeClass, slotNumberClass, paddingClass, indicatorSpacing } =
    getSlotStylingConfig();

  function handleForceReset() {
    // if(!slotData.hn) {
    if (openReset) {
      setOpenReset(false);
    } else {
      setOpenReset(true);
    }
    // }
  }

  // useEffect(() => {
  //   ipcRenderer.on("dispensing", () => {
  //     setBg("bg-[#007852]");
  //   });
  //   ipcRenderer.on("dispensing-reset", () => {
  //     setBg("bg-[#F6F6F6]");
  //   });
  // }, [bg]);

  return (
    <div className={`relative ${slotSizeClass}`}>
      {/* Reset Button - Outside overflow boundary */}
      <button
        className="absolute -top-3 lg:-top-4 xl:-top-5 -left-3 lg:-left-4 xl:-left-5 btn btn-circle btn-xs lg:btn-sm xl:btn-sm hover:bg-[orangered] z-10"
        onClick={handleForceReset}
      >
        <BsArrowClockwise className="text-white w-3 h-3 lg:w-4 lg:h-4 xl:w-5 xl:h-5" />
      </button>

      {/* Slot Content - With overflow protection */}
      <div
        className={`relative w-full h-full ${bg} shadow-xl rounded-xl ${paddingClass} cursor-default overflow-hidden`}
      >
        <div className="flex justify-between">
          <div className="font-bold text-sm lg:text-base xl:text-lg 2xl:text-xl">
            HN
          </div>
          <div>
            <FaLock className="fill-[#00ff55] w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 2xl:w-8 2xl:h-8" />
          </div>
        </div>
        <div className="flex flex-col pt-2 lg:pt-3 xl:pt-4 justify-start items-start min-h-[50px] lg:min-h-[55px] xl:min-h-[60px] 2xl:min-h-[65px]">
          <div className="tooltip" data-tip={hn}>
            <div className="font-bold text-[#5495f6] text-base lg:text-lg xl:text-xl 2xl:text-2xl mb-1">
              {hn.length > 6 ? `${hn.slice(0, 6)}...` : hn}
            </div>
          </div>
        </div>
        <div className="flex flex-col leading-4 pt-1 lg:pt-2 px-1 items-start">
          <div className="flex justify-between w-full px-1 lg:px-2">
            <div className="text-[10px] lg:text-xs xl:text-sm 2xl:text-base">
              {date}
            </div>
            <div className="text-[10px] lg:text-xs xl:text-sm 2xl:text-base">
              {time}
            </div>
          </div>
          <div className={`flex w-full ${indicatorSpacing}`}>
            <Indicator value={temp} unit="*C" title="Temp." threshold={50} />
            <Indicator value={humid} unit="%" title="%RH" threshold={85} />
          </div>
        </div>

        <div
          className={`absolute bottom-2 right-2 text-[#5495F6] ${slotNumberClass} font-bold`}
        >
          {slotNo}
        </div>
      </div>

      <Modal isOpen={openReset} onClose={handleForceReset}>
        <ResetSlotOrNot slotNo={slotNo} hn={hn} onClose={handleForceReset} />
      </Modal>
    </div>
  );
};

export default LockedSlot;

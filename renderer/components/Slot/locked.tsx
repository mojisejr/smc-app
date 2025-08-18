import { useState } from "react";
import { FaLock } from "react-icons/fa";
import { BsArrowClockwise } from "react-icons/bs";
import Modal from "../Modals";
import ResetSlotOrNot from "../Dialogs/ResetSlotOrNot";
import Indicator from "../Indicators/baseIndicator";
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
    <div
      className={`relative min-w-[170px] min-h-[175px] ${bg} shadow-xl rounded-xl p-4 cursor-default`}
    >
      <div className="flex justify-between">
        <div className="font-bold">HN</div>
        <div>
          <FaLock className="fill-[#00ff55]" size={25} />
        </div>
      </div>
      <div className="flex flex-col pt-3 justify-start items-start">
        <div className="tooltip" data-tip={hn}>
          <div className="font-bold text-[#5495f6] text-3xl">
            {hn.length > 6 ? `${hn.slice(0, 6)}...` : hn}
          </div>
        </div>
      </div>
      <div className="flex flex-col leading-4 pt-3 px-1 items-start">
        <div className="flex justify-between w-full px-2 gap-3">
          <div className="text-[12px] font-semibold">{date}</div>
          <div className="text-[12px] font-semibold">{time}</div>
        </div>
        <div className="flex w-full">
          <Indicator value={temp} unit="*C" title="Temp." threshold={50} />
          <Indicator value={humid} unit="%" title="%RH" threshold={85} />
        </div>
      </div>

      <div className="absolute bottom-2 right-2 text-[#5495F6] text-[40px] font-bold">
        {slotNo}
      </div>
      <button
        className="absolute -top-3 -left-2  btn btn-circle btn-sm hover:bg-[orangered]"
        onClick={handleForceReset}
      >
        <BsArrowClockwise className="text-white" />
      </button>
      <Modal isOpen={openReset} onClose={handleForceReset}>
        <ResetSlotOrNot slotNo={slotNo} hn={hn} onClose={handleForceReset} />
      </Modal>
    </div>
  );
};

export default LockedSlot;

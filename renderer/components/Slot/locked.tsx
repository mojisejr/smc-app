import { useState, useEffect } from "react";
import { ipcRenderer } from "electron";
import { FaLock } from "react-icons/fa";
import { BsArrowClockwise } from "react-icons/bs";
import Modal from "../Modals";
import ResetSlotOrNot from "../Dialogs/ResetSlotOrNot";
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
  const [isDispensing, setIsDispensing] = useState<boolean>(false);
  const [openReset, setOpenReset] = useState<boolean>(false);

  function handleForceReset() {
    if (openReset) {
      setOpenReset(false);
    } else {
      setOpenReset(true);
    }
  }

  useEffect(() => {
    ipcRenderer.on("dispensing", () => {
      setIsDispensing(true);
    });
    ipcRenderer.on("dispensing-reset", () => {
      setIsDispensing(false);
    });
    
    return () => {
      ipcRenderer.removeAllListeners("dispensing");
      ipcRenderer.removeAllListeners("dispensing-reset");
    };
  }, []);

  return (
    <div
      className={`relative min-w-[170px] min-h-[175px] transition-all duration-300 ease-in-out ${
        isDispensing 
          ? "bg-orange-50/90 backdrop-blur-sm border border-orange-200/60 shadow-lg" 
          : "bg-blue-50/90 backdrop-blur-sm border border-blue-200/50 shadow-lg"
      } rounded-xl p-3 cursor-default`}
    >
      <div className="flex justify-between items-center">
        <div className="font-semibold text-blue-800 text-sm tracking-wide">HN</div>
        <FaLock className={`transition-colors duration-200 ${
          isDispensing ? "fill-orange-600" : "fill-blue-600"
        }`} size={20} />
      </div>
      <div className="flex flex-col pt-2 justify-start items-start">
        <div className="tooltip" data-tip={hn}>
          <div className={`font-bold text-lg tracking-wide ${
            isDispensing ? "text-orange-700" : "text-blue-700"
          }`}>
            {hn.length > 8 ? `${hn.slice(0, 8)}...` : hn}
          </div>
        </div>
      </div>
      <div className="flex flex-col leading-4 pt-2 items-start">
        <div className="flex justify-between w-full text-xs text-gray-600 mb-2">
          <span>{date}</span>
          <span>{time}</span>
        </div>
        <div className="flex gap-2 text-xs text-gray-500 items-center">
          <span className="flex items-center gap-1">
            <span>🌡️</span>
            <span>{temp}°C</span>
          </span>
          <span className="flex items-center gap-1">
            <span>💧</span>
            <span>{humid}%</span>
          </span>
        </div>
      </div>

      <div className={`absolute bottom-2 right-2 text-[40px] font-bold transition-colors duration-200 ${
        isDispensing ? "text-orange-700" : "text-blue-700"
      }`}>
        {slotNo}
      </div>
      <button
        className="absolute -top-3 -left-2 btn btn-circle btn-sm bg-red-500 hover:bg-red-600 border-red-500 hover:border-red-600 transition-colors duration-200"
        onClick={handleForceReset}
      >
        <BsArrowClockwise className="text-white" size={14} />
      </button>
      <Modal isOpen={openReset} onClose={handleForceReset}>
        <ResetSlotOrNot slotNo={slotNo} hn={hn} onClose={handleForceReset} />
      </Modal>
    </div>
  );
};

export default LockedSlot;

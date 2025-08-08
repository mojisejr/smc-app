import { ipcRenderer } from "electron";
import { useEffect } from "react";
import Loading from "../Shared/Loading";

interface DispensingWaitProps {
  slotNo: number;
  hn: string;
  onClose: () => void;
  onOpenDeactive: () => void;
}

const DispensingWait = ({ slotNo, hn, onClose, onOpenDeactive }: DispensingWaitProps) => {
  useEffect(() => {
	ipcRenderer.on("deactivated", () => {
	onClose();
});
  }, []);


const handleCheckLockedBack = () => {
  ipcRenderer.invoke("check-locked-back", {slotId: slotNo});
}

  




  return (
    <>
      <div className="flex gap-2">
        <div className="flex flex-col bg-orange-50/90 backdrop-blur-sm border border-orange-200/50 rounded-xl shadow-lg overflow-hidden gap-3 max-w-[320px]">
          <div className="flex justify-between items-center bg-orange-100/70 backdrop-blur-sm p-4 font-bold text-lg">
            <span className="font-bold text-orange-800 tracking-wide">HN: {hn}</span>
            <button onClick={onOpenDeactive} className="btn btn-ghost btn-circle btn-sm font-bold text-orange-600 hover:bg-orange-100/50 transition-colors duration-200">!</button>
          </div>
          <div className="flex flex-col p-4 flex-wrap justify-center items-center gap-3">
            <div className="font-bold text-orange-700 text-center">
              📦 ช่อง # {slotNo} เปิดอยู่
            </div>
            <p className="font-semibold text-orange-800 text-center leading-relaxed">
              เอายาออกจากช่องแล้วปิดช่อง จากนั้นกดปุ่มตกลง
            </p>
            <Loading />
            <button className="btn bg-orange-100/70 backdrop-blur-sm border border-orange-200/40 hover:bg-orange-600 hover:text-white text-orange-800 font-bold transition-all duration-300 shadow-md hover:shadow-lg" onClick={handleCheckLockedBack}>ตกลง</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DispensingWait;

import { ipcRenderer } from "electron";
import { useEffect } from "react";
import Loading from "../Shared/Loading";


interface LockWaitProps {
  slotNo: number;
  hn: string;
  onClose: () => void;
  onOpenDeactive: () => void;
}

const LockWait = ({ slotNo, hn, onClose, onOpenDeactive }: LockWaitProps) => {

 useEffect(() => {
ipcRenderer.on("deactivated", ()  =>  {
	onClose();
});

}, []);

const handleCheckLockedBack = () => {
  ipcRenderer.invoke("check-locked-back", {slotId: slotNo});
}


  return (
    <>
      <div className="flex flex-col bg-blue-50/90 backdrop-blur-sm border border-blue-200/50 rounded-xl shadow-lg overflow-hidden gap-3 max-w-[320px]">
        <div className="flex justify-between items-center bg-blue-100/70 backdrop-blur-sm p-4 font-bold text-lg">
          <span className="font-bold text-blue-800 tracking-wide">HN: {hn}</span>
          <button onClick={onOpenDeactive} className="btn btn-circle btn-sm btn-ghost font-bold text-blue-600 hover:bg-blue-100/50 transition-colors duration-200">!</button>
        </div>
        <div className="flex flex-col p-4 flex-wrap justify-center items-center gap-3">
          <div className="font-bold text-blue-700 text-center">
            🔓 ช่อง #{slotNo} เปิดอยู่
          </div>
          <p className="font-semibold text-blue-800 text-center leading-relaxed">
            นำยาเข้าช่อง #{slotNo} และปิดช่อง จากนั้นกดปุ่มตกลง
          </p>
          <Loading />
          <button className="btn bg-blue-100/70 backdrop-blur-sm border border-blue-200/40 hover:bg-blue-600 hover:text-white text-blue-800 font-bold transition-all duration-300 shadow-md hover:shadow-lg" onClick={handleCheckLockedBack}>ตกลง</button>
        </div>
      </div>
    </>
  );
};

export default LockWait;

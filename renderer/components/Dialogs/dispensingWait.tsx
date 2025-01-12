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
        <div className="flex flex-col rounded-md overflow-hidden gap-2 max-w-[300px]">
          <div className="flex justify-between shadow-xl p-3 font-bold text-xl text-center">
            <span className={"font-bold"}>HN: {hn}</span>
	    <button onClick={onOpenDeactive} className="btn btn-ghost btn-circle btn-sm font-bold text-xl">!</button>
          </div>
          <div className="flex flex-col p-3 flex-wrap jusitfy-center items-center">
            <div className="font-bold text-[#ff0000]">
              ช่อง # {slotNo} เปิดอยู่
            </div>
            <p className="font-bold p-3">
              เอายาออกจากช่องแล้วปิดช่อง จากนั้นกดปุ่มตกลง
            </p>
            <Loading />
            <button className="btn" onClick={handleCheckLockedBack}>ตกลง</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DispensingWait;

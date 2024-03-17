import { useForm, SubmitHandler } from "react-hook-form";
import { ipcRenderer } from "electron";
import { useEffect, useState } from "react";
import Loading from "../Shared/Loading";
import Slot from "../Slot";
// import { IO } from "../../enums/ipc-enums";

interface DispensingWaitProps {
  slotNo: number;
  hn: string;
  onClose: () => void;
  onOpenDeactive: () => void;
}

const DispensingWait = ({ slotNo, hn, onClose, onOpenDeactive }: DispensingWaitProps) => {
  useEffect(() => {
	ipcRenderer.on("deactivated", () => {
console.log('deactivated on dispense');
	onClose();
});
  }, []);

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
              Slot No [{slotNo}] is Opening
            </div>
            <p className="font-bold p-3">
              Dispense drugs the opening slot and close the drawer back with in
              30 seconds
            </p>
            <Loading />
          </div>
        </div>
      </div>
    </>
  );
};

export default DispensingWait;

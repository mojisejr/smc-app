import { useForm, SubmitHandler } from "react-hook-form";
import { ipcRenderer } from "electron";
import { useEffect, useState } from "react";
import Loading from "../Shared/Loading";
import Slot from "../Slot";
// import { IO } from "../../enums/ipc-enums";

interface DispensingWaitProps {
  slotNo: number;
  hn: string;
}

const DispensingWait = ({ slotNo, hn }: DispensingWaitProps) => {
  useEffect(() => {
    // ipcRenderer.invoke(IO.WaitForDispensingLockBack, slotNo, hn);
  }, []);

  return (
    <>
      <div className="flex gap-2">
        <div className="flex flex-col rounded-md overflow-hidden gap-2 max-w-[300px]">
          <div className="shadow-xl p-2 font-bold text-xl text-center">
            HN: {hn}
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

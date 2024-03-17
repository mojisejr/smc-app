import { useForm, SubmitHandler } from "react-hook-form";
import { ipcRenderer } from "electron";
import { useEffect, useState } from "react";
import Loading from "../Shared/Loading";
import DeActivate from "./Deactivate";
import Modal from "../Modals";

// import { IO } from "../../enums/ipc-enums";

interface LockWaitProps {
  slotNo: number;
  hn: string;
}

const LockWait = ({ slotNo, hn }: LockWaitProps) => {
  const [openDeactivate, setOpenDeactivate] = useState<boolean>(false);


  const handleDeactivate = () => {
      if (openDeactivate) {
        setOpenDeactivate(false);
      } else {
        setOpenDeactivate(true);
      }
  };

  return (
    <>
      <div className="flex flex-col rounded-md overflow-hidden gap-2 max-w-[300px]">
        <div className="flex justify-between items-center shadow-xl px-3 py-2 font-bold text-xl">
          HN: {hn}
          <button onClick={handleDeactivate}  className="btn btn-circle btn-sm btn-ghost font-bold text-xl">!</button>
        </div>
        <div className="flex flex-col p-3 flex-wrap jusitfy-center items-center">
          <div className="font-bold text-[#ff0000]">
            Slot No [{slotNo}] is Opening
          </div>
          <p className="font-bold p-3">
            Put the drugs into the opening slot and close the drawer back with
            in 30 seconds
          </p>
          <Loading />
        </div>
      <Modal isOpen={openDeactivate} onClose={setOpenDeactivate}>
        <DeActivate slotNo={slotNo} onClose={setOpenDeactivate} />
      </Modal>

      </div>
    </>
  );
};

export default LockWait;

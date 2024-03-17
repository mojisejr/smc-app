import { ipcRenderer } from "electron";
import { useDispense } from "../../hooks/useDispense";
import { useApp } from "../../contexts/appContext";
import { useRef ,useEffect } from "react";
// import { IO } from "../../enums/ipc-enums";

interface DeActivateProps {
  slotNo: number;
  onClose: () => void;
}

const DeActivate = ({ slotNo, onClose }: DeActivateProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { user } = useApp();

  function handleReset() {
    const reason = inputRef.current?.value; 
    ipcRenderer.invoke("deactivate", { slot: slotNo, reason, stuffId: user.stuffId }).then(() => {
      onClose();
    });
  }
  function handleContinue() {
    // ipcRenderer.invoke(IO.DispensingContinue, slotNo, hn);
    onClose();
  }

  return (
    <>
      <div className="flex gap-2 p-5 flex-col max-w-[300px]">
        <div className="text-[#ff0000] font-bold text-xl">
          DANGER! this process will permanantly DEACTIVATE slot #{slotNo}?
        </div>

        <input type="text" className="input" placeholder="reset reason" ref={inputRef}></input>
        <button
          className="p-3 bg-gray-200 hover:bg-[#5495f6] text-white font-bold rounded-md"
          onClick={handleReset}
        >
          Deactivate
        </button>
        <button
          className="p-3 bg-gray-200 hover:bg-[#ff0000] text-white font-bold rounded-md"
          onClick={() => handleContinue()}
        >
          Cancel
        </button>
      </div>
    </>
  );
};

export default DeActivate;

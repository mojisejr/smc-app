import { ipcRenderer } from "electron";
import { useDispense } from "../../hooks/useDispense";
// import { IO } from "../../enums/ipc-enums";

interface ClearOrContinueProps {
  slotNo: number;
  hn: string;
  onClose: () => void;
}

const ClearOrContinue = ({ slotNo, hn, onClose }: ClearOrContinueProps) => {
  const { reset, keep } = useDispense();
  function handleClear() {
    // console.log("clear");
    // ipcRenderer.invoke(IO.DispensingClear, slotNo, hn);
    ipcRenderer.invoke("reset", { slot: slotNo, hn }).then(() => {
      reset(slotNo);
      onClose();
    });
  }
  function handleContinue() {
    // ipcRenderer.invoke(IO.DispensingContinue, slotNo, hn);
    keep();
    onClose();
  }

  return (
    <>
      <div className="flex gap-2 p-5 flex-col max-w-[300px]">
        <div className="text-[#ff0000] font-bold text-xl">
          Does HN: {hn} still have some drug in this slot #{slotNo}?
        </div>

        <button
          className="p-3 bg-gray-200 hover:bg-[#5495f6] text-white font-bold rounded-md"
          onClick={handleContinue}
        >
          Yes it does.
        </button>
        <button
          className="p-3 bg-gray-200 hover:bg-[#ff0000] text-white font-bold rounded-md"
          onClick={() => handleClear()}
        >
          Let's clear.
        </button>
      </div>
    </>
  );
};

export default ClearOrContinue;

import { ipcRenderer } from "electron";
import { useApp } from "../../contexts/appContext";
import { useRef, useState  } from "react";
import Loading from "../Shared/Loading";

interface DeActivateProps {
  slotNo: number;
  onClose: () => void;
}

const DeActivate = ({ slotNo, onClose }: DeActivateProps) => {
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useApp();

  function handleReset() {
    const reason = inputRef.current?.value; 
    ipcRenderer.invoke("deactivate", { slot: slotNo, reason, user: user.name }).then(() => {
      onClose();
    });
  }
  function handleContinue() {
    onClose();
  }

  return (
    <>
      <div className="flex gap-2 p-5 flex-col max-w-[300px]">
        <div className="text-[#ff0000] font-bold text-xl">
          อันตราย! กระบวนการนี้จะทำให้ช่อง #{slotNo} ถูกปิดใช้งาน?
        </div>

        <input type="text" className="input" placeholder="reset reason" ref={inputRef}></input>
        <button
          disabled={loading}
          className="p-3 bg-gray-200 hover:bg-[#5495f6] text-white font-bold rounded-md"
          onClick={handleReset}
        >
          { loading ? <Loading /> : `ปิดช่อง ${slotNo}` }
        </button>
        <button
          disabled={loading}
          className="p-3 bg-gray-200 hover:bg-[#ff0000] text-white font-bold rounded-md"
          onClick={() => handleContinue()}
        >
          { loading  ? <Loading /> : "ยกเลิก" }
        </button>
      </div>
    </>
  );
};

export default DeActivate;

import { ipcRenderer } from "electron";
import { useApp } from "../../contexts/appContext";
import { useRef, useState } from "react";
import Loading from "../Shared/Loading";
import { toast } from "react-toastify";

interface DeActivateProps {
  slotNo: number;
  onClose: () => void;
}

const DeActivate = ({ slotNo, onClose }: DeActivateProps) => {
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const passkeyRef = useRef<HTMLInputElement>(null);

  function handleReset() {
    const reason = inputRef.current?.value;
    const passkey = passkeyRef.current?.value;

    if (!passkey) {
      toast.error("กรุณากรอกรหัสผ่าน");
      return;
    }

    if (!reason) {
      toast.error("กรุณากรอกเหตุผลของการปิดช่อง");
      return;
    }

    ipcRenderer
      .invoke("deactivate", {
        slotId: slotNo,
        reason,
        passkey,
      })
      .then(() => {
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

        <input
          type="text"
          className="input"
          placeholder="เหตุผลของการปิดช่อง"
          ref={inputRef}
        ></input>
        <input
          type="password"
          className="input"
          placeholder="รหัสผู้ใช้"
          ref={passkeyRef}
        ></input>
        <button
          disabled={loading}
          className="p-3 bg-gray-200 hover:bg-[#5495f6] text-white font-bold rounded-md"
          onClick={handleReset}
        >
          {loading ? <Loading /> : `ปิดช่อง ${slotNo}`}
        </button>
        <button
          disabled={loading}
          className="p-3 bg-gray-200 hover:bg-[#ff0000] text-white font-bold rounded-md"
          onClick={() => handleContinue()}
        >
          {loading ? <Loading /> : "ยกเลิก"}
        </button>
      </div>
    </>
  );
};

export default DeActivate;

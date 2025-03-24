import { ipcRenderer } from "electron";
import { useDispense } from "../../hooks/useDispense";
import { useRef, useState } from "react";
import Loading from "../Shared/Loading";
import { toast } from "react-toastify";
import { useDispensingContext } from "../../contexts/dispensingContext";

interface ClearOrContinueProps {
  slotNo: number;
  hn: string;
  onClose: () => void;
}

const ClearOrContinue = ({ slotNo, hn, onClose }: ClearOrContinueProps) => {
  const [loading, setLoading] = useState(false);
  const { reset, keep } = useDispense();
  const { passkey, setPasskey } = useDispensingContext();

  function handleClear() {
    if (!passkey) {
      toast.error("กรุณากรอกรหัสผ่าน");
      return;
    }

    setLoading(true);
    ipcRenderer.invoke("reset", { slotId: slotNo, hn, passkey }).then(() => {
      reset(slotNo);
      setPasskey(null);
      onClose();
    });
  }
  function handleContinue() {
    if (!passkey) {
      toast.error("กรุณากรอกรหัสผ่าน");
      return;
    }

    setLoading(true);
    ipcRenderer
      .invoke("dispense-continue", {
        slotId: slotNo,
        hn,
        passkey,
      })
      .then(() => {
        keep();
        setPasskey(null);
        onClose();
      });
  }

  return (
    <>
      <div className="flex gap-2 p-5 flex-col max-w-[300px]">
        <div className="text-[#ff0000] font-bold text-xl">
          คนไข้ HN: {hn} ยังเหลือยาที่ต้องจ่ายจากช่อง #{slotNo} อีกหรือไม่?
        </div>
        <button
          disabled={loading}
          className="p-3 bg-gray-200 hover:bg-[#5495f6] text-white font-bold rounded-md"
          onClick={handleContinue}
        >
          {loading ? <Loading /> : "มีอีก"}
        </button>
        <button
          className="p-3 bg-gray-200 hover:bg-[#ff0000] text-white font-bold rounded-md"
          onClick={() => handleClear()}
        >
          {loading ? <Loading /> : "ไม่มีแล้ว"}
        </button>
      </div>
    </>
  );
};

export default ClearOrContinue;

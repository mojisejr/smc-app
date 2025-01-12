import { ipcRenderer } from "electron";
import { useDispense } from "../../hooks/useDispense";
import { useState } from "react";
import Loading from "../Shared/Loading";

interface ClearOrContinueProps {
  slotNo: number;
  hn: string;
  onClose: () => void;
}

const ClearOrContinue = ({ slotNo, hn, onClose }: ClearOrContinueProps) => {
  const [loading, setLoading] = useState(false);
  const { reset, keep } = useDispense();
  function handleClear() {
    setLoading(true);
    ipcRenderer.invoke("reset", { slot: slotNo, hn }).then(() => {
      reset(slotNo);
      onClose();
    });
  }
  function handleContinue() {
    setLoading(true);
    keep();
    onClose();
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
          { loading ? <Loading /> : "มีอีก" }
        </button>
        <button
          className="p-3 bg-gray-200 hover:bg-[#ff0000] text-white font-bold rounded-md"
          onClick={() => handleClear()}
        >
          { loading ? <Loading /> : "ไม่มีแล้ว" }
        </button>
      </div>
    </>
  );
};

export default ClearOrContinue;

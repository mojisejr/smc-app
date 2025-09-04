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
      <div className="flex gap-4 p-5 flex-col max-w-[350px]">
        {/* Progress Header */}
        <div className="text-center bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="text-sm text-gray-600 mb-1">ขั้นตอนที่ 2 ของ 2</div>
          <div className="font-bold text-blue-700">HN: {hn}</div>
        </div>
        
        {/* Question */}
        <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-orange-700 font-bold text-lg leading-relaxed">
            🩺 คนไข้ยังเหลือยาที่ต้องจ่าย<br/>
            จากช่อง #{slotNo} อีกหรือไม่?
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            disabled={loading}
            className="w-full p-4 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold rounded-lg shadow-lg transition-colors duration-200 flex items-center justify-center gap-2"
            onClick={handleContinue}
          >
            {loading ? <Loading /> : (
              <>
                <span className="text-xl">📋</span>
                มีอีก (เก็บข้อมูลผู้ป่วยไว้)
              </>
            )}
          </button>
          
          <button
            disabled={loading}
            className="w-full p-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-lg shadow-lg transition-colors duration-200 flex items-center justify-center gap-2"
            onClick={() => handleClear()}
          >
            {loading ? <Loading /> : (
              <>
                <span className="text-xl">✅</span>
                ไม่มีแล้ว (เคลียร์ช่อง)
              </>
            )}
          </button>
        </div>

        {/* Info Footer */}
        <div className="text-xs text-gray-500 text-center mt-2 p-2 bg-gray-50 rounded">
          💡 เลือก "มีอีก" หากผู้ป่วยยังต้องใช้ช่องนี้ต่อ<br/>
          เลือก "ไม่มีแล้ว" หากจ่ายยาครบแล้วและต้องการเคลียร์ช่อง
        </div>
      </div>
    </>
  );
};

export default ClearOrContinue;

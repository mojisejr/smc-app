import { ipcRenderer } from "electron";
import { useRef } from "react";
import { toast } from "react-toastify";

interface ResetSlotOrNotProps {
  slotNo: number;
  hn: string;
  onClose: () => void;
}

const ResetSlotOrNot = ({ slotNo, hn, onClose }: ResetSlotOrNotProps) => {
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
      toast.error("กรุณากรอกเหตุผลการล้างช่อง");
      return;
    }

    ipcRenderer
      .invoke("force-reset", {
        slotId: slotNo,
        hn,
        reason: reason,
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
      <div className="flex gap-3 p-5 flex-col max-w-[320px] bg-red-50/90 backdrop-blur-sm border border-red-200/50 rounded-xl shadow-lg">
        <div className="text-red-700 font-bold text-lg leading-tight tracking-wide">
          ⚠️ ระวัง [FORCE RESET] จะทำให้สถานะของช่อง กลับมาเป็นว่าง
          กรุณาเอายาที่เหลือออกจากช่อง {slotNo} ก่อนนะครับ
        </div>

        <input
          type="text"
          className="p-3 bg-red-50/70 backdrop-blur-sm border border-red-200/30 rounded-lg text-red-900 placeholder-red-600/70 focus:bg-red-50/90 focus:border-red-300/50 focus:outline-none transition-all duration-200"
          placeholder="เหตุผลการล้างช่อง"
          ref={inputRef}
        />
        <input
          type="password"
          className="p-3 bg-red-50/70 backdrop-blur-sm border border-red-200/30 rounded-lg text-red-900 placeholder-red-600/70 focus:bg-red-50/90 focus:border-red-300/50 focus:outline-none transition-all duration-200"
          placeholder="รหัสผู้ใช้"
          ref={passkeyRef}
        />
        <button
          className="p-3 bg-red-100/70 backdrop-blur-sm border border-red-200/40 hover:bg-red-600 hover:text-white text-red-800 font-bold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
          onClick={handleReset}
        >
          เคลียร์ช่อง {slotNo}
        </button>
        <button
          className="p-3 bg-gray-100/70 backdrop-blur-sm border border-gray-200/40 hover:bg-gray-600 hover:text-white text-gray-800 font-bold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
          onClick={() => handleContinue()}
        >
          ยกเลิก
        </button>
      </div>
    </>
  );
};

export default ResetSlotOrNot;

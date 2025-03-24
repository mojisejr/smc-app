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
      <div className="flex gap-2 p-5 flex-col max-w-[300px]">
        <div className="text-[#ff0000] font-bold text-xl">
          ระวังการ [FORCE RESET] จะทำให้สถานะของช่อง กลับมาเป็นว่าง
          กรุณาเอายาที่เหลือออกจากช่อง {slotNo} ก่อนนะครับ
        </div>

        <input
          type="text"
          className="input"
          placeholder="เหตุผลการล้างช่อง"
          ref={inputRef}
        ></input>
        <input
          type="password"
          className="input"
          placeholder="รหัสผู้ใช้"
          ref={passkeyRef}
        ></input>
        <button
          className="p-3 bg-gray-200 hover:bg-[#5495f6] text-white font-bold rounded-md"
          onClick={handleReset}
        >
          เคลียร์ช่อง {slotNo}
        </button>
        <button
          className="p-3 bg-gray-200 hover:bg-[#ff0000] text-white font-bold rounded-md"
          onClick={() => handleContinue()}
        >
          ยกเลิก
        </button>
      </div>
    </>
  );
};

export default ResetSlotOrNot;

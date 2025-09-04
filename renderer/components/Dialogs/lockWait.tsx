import { ipcRenderer } from "electron";
import { useEffect } from "react";
import Loading from "../Shared/Loading";
import {
  DialogBase,
  DialogHeader,
  StatusIndicator,
  DialogButton,
} from "../Shared/DesignSystem";

interface LockWaitProps {
  slotNo: number;
  hn: string;
  onClose: () => void;
  onOpenDeactive: () => void;
}

const LockWait = ({ slotNo, hn, onClose, onOpenDeactive }: LockWaitProps) => {
  useEffect(() => {
    ipcRenderer.on("deactivated", () => {
      onClose();
    });
  }, []);

  const handleCheckLockedBack = () => {
    ipcRenderer.invoke("check-locked-back", { slotId: slotNo });
  };

  return (
    <DialogBase maxWidth="max-w-[350px]">
      <DialogHeader
        title="การรอใส่ยา"
        hn={hn}
        onEmergencyAction={onOpenDeactive}
        emergencyLabel="!"
      />

      <div className="flex flex-col p-4 gap-4">
        <StatusIndicator
          status="error"
          message="เปิดอยู่"
          slotNo={slotNo}
          animated={true}
        />

        <div className="text-center space-y-3 flex flex-col justify-center">
          <p className="font-medium text-gray-700 leading-relaxed">
            📋 <strong>คำแนะนำ:</strong>
            <br />
            1. นำยาเข้าช่อง #{slotNo}
            <br />
            2. ปิดช่องให้แน่น
            <br />
            3. กดปุ่ม "ตกลง" เพื่อดำเนินการต่อ
          </p>

          <div className="py-2">
            <Loading />
          </div>

          <DialogButton
            variant="primary"
            onClick={handleCheckLockedBack}
            icon="✓"
          >
            ตกลง
          </DialogButton>
        </div>
      </div>
    </DialogBase>
  );
};

export default LockWait;

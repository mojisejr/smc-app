import { ipcRenderer } from "electron";
import { useEffect, useState } from "react";
import Loading from "../Shared/Loading";
import { toast } from "react-toastify";
import {
  DialogBase,
  DialogHeader,
  StatusIndicator,
  DialogButton,
} from "../Shared/DesignSystem";

interface DispensingWaitProps {
  slotNo: number;
  hn: string;
  onClose: () => void;
  onOpenDeactive: () => void;
}

const DispensingWait = ({
  slotNo,
  hn,
  onClose,
  onOpenDeactive,
}: DispensingWaitProps) => {
  const [isCheckingLock, setIsCheckingLock] = useState(false);

  useEffect(() => {
    const handleDeactivatedEvent = () => {
      // Debug log removed for production
      onClose();
    };

    const handleLockedBackSuccessEvent = (event: any, payload: any) => {
      // Debug log removed for production

      // Validate that this event is for our slot
      if (payload.slotId === slotNo && payload.hn === hn) {
        // Debug log removed for production
        // The useDispense hook should handle the state transition
      } else {
        // Debug log removed for production
      }
    };

    const handleLockedBackErrorEvent = (event: any, error: any) => {
      // console.log(
      //   "DISPENSING WAIT DEBUG: Received locked-back-error event:",
      //   error
      // );
      toast.error("เกิดข้อผิดพลาดในการตรวจสอบการปิดช่อง กรุณาลองใหม่");
    };

    ipcRenderer.on("deactivated", handleDeactivatedEvent);
    ipcRenderer.on("locked-back-success", handleLockedBackSuccessEvent);
    ipcRenderer.on("locked-back-error", handleLockedBackErrorEvent);

    return () => {
      ipcRenderer.removeListener("deactivated", handleDeactivatedEvent);
      ipcRenderer.removeListener(
        "locked-back-success",
        handleLockedBackSuccessEvent
      );
      ipcRenderer.removeListener(
        "locked-back-error",
        handleLockedBackErrorEvent
      );
    };
  }, [slotNo, hn, onClose]);

  const handleCheckLockedBack = () => {
    // Validate required data before IPC call
    if (!slotNo || !hn) {
      // console.error("DISPENSING WAIT ERROR: Missing slotNo or hn", {
      //   slotNo,
      //   hn,
      // });
      toast.error("ข้อมูลไม่ครบถ้วน กรุณาเริ่มกระบวนการใหม่");
      return;
    }

    // console.log(
    //   "DISPENSING DIALOG TRACE: CHECK LOCKED BACK ON DISPENSING PROCESS",
    //   {
    //     slotId: slotNo,
    //     hn: hn,
    //   }
    // );

    setIsCheckingLock(true);

    ipcRenderer
      .invoke("check-locked-back", { slotId: slotNo, hn: hn })
      .then(() => {
        // console.log(
        //   "DISPENSING WAIT DEBUG: check-locked-back IPC call successful"
        // );
        setIsCheckingLock(false);
      })
      .catch((error) => {
        // console.error(
        //   "DISPENSING WAIT ERROR: check-locked-back IPC failed:",
        //   error
        // );
        toast.error("ไม่สามารถตรวจสอบการปิดช่องได้: " + error.message);
        setIsCheckingLock(false);
      });
  };

  return (
    <DialogBase maxWidth="max-w-[350px]">
      <DialogHeader
        title=""
        currentStep={1}
        totalSteps={2}
        hn={hn}
        onEmergencyAction={onOpenDeactive}
        emergencyLabel="!"
        bgColor="bg-blue-50"
        textColor="text-blue-700"
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
            1. เอายาออกจากช่อง
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
            loading={isCheckingLock}
            onClick={handleCheckLockedBack}
            icon={!isCheckingLock ? "✓" : undefined}
          >
            {isCheckingLock ? "กำลังตรวจสอบการปิดช่อง..." : "ตกลง"}
          </DialogButton>
        </div>
      </div>
    </DialogBase>
  );
};

export default DispensingWait;

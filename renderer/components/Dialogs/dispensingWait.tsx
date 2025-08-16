import { ipcRenderer } from "electron";
import { useEffect, useState } from "react";
import Loading from "../Shared/Loading";
import { toast } from "react-toastify";

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
      console.log("DISPENSING WAIT DEBUG: Received deactivated event");
      onClose();
    };

    const handleLockedBackSuccessEvent = (event: any, payload: any) => {
      console.log("DISPENSING WAIT DEBUG: Received locked-back-success event:", payload);
      
      // Validate that this event is for our slot
      if (payload.slotId === slotNo && payload.hn === hn) {
        console.log("DISPENSING WAIT DEBUG: Slot locked back successfully, dialog should transition");
        // The useDispense hook should handle the state transition
      } else {
        console.warn("DISPENSING WAIT DEBUG: Received event for different slot/hn:", {
          received: { slotId: payload.slotId, hn: payload.hn },
          expected: { slotNo, hn }
        });
      }
    };

    const handleLockedBackErrorEvent = (event: any, error: any) => {
      console.log("DISPENSING WAIT DEBUG: Received locked-back-error event:", error);
      toast.error("เกิดข้อผิดพลาดในการตรวจสอบการปิดช่อง กรุณาลองใหม่");
    };

    ipcRenderer.on("deactivated", handleDeactivatedEvent);
    ipcRenderer.on("locked-back-success", handleLockedBackSuccessEvent);
    ipcRenderer.on("locked-back-error", handleLockedBackErrorEvent);

    return () => {
      ipcRenderer.removeListener("deactivated", handleDeactivatedEvent);
      ipcRenderer.removeListener("locked-back-success", handleLockedBackSuccessEvent);
      ipcRenderer.removeListener("locked-back-error", handleLockedBackErrorEvent);
    };
  }, [slotNo, hn, onClose]);

  const handleCheckLockedBack = () => {
    // Validate required data before IPC call
    if (!slotNo || !hn) {
      console.error("DISPENSING WAIT ERROR: Missing slotNo or hn", { slotNo, hn });
      toast.error("ข้อมูลไม่ครบถ้วน กรุณาเริ่มกระบวนการใหม่");
      return;
    }

    console.log("DISPENSING DIALOG TRACE: CHECK LOCKED BACK ON DISPENSING PROCESS", {
      slotId: slotNo,
      hn: hn
    });
    
    ipcRenderer.invoke("check-locked-back", { slotId: slotNo, hn: hn })
      .then(() => {
        console.log("DISPENSING WAIT DEBUG: check-locked-back IPC call successful");
      })
      .catch((error) => {
        console.error("DISPENSING WAIT ERROR: check-locked-back IPC failed:", error);
        toast.error("ไม่สามารถตรวจสอบการปิดช่องได้: " + error.message);
      });
  };

  return (
    <>
      <div className="flex gap-2">
        <div className="flex flex-col rounded-md overflow-hidden gap-2 max-w-[350px]">
          {/* Progress Header */}
          <div className="flex justify-between shadow-xl p-3 font-bold text-xl text-center bg-blue-50">
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">ขั้นตอนที่ 1 ของ 2</span>
              <span className={"font-bold text-blue-700"}>HN: {hn}</span>
            </div>
            <button
              onClick={onOpenDeactive}
              className="btn btn-ghost btn-circle btn-sm font-bold text-xl hover:bg-red-100"
              title="ปิดใช้งานช่อง"
            >
              !
            </button>
          </div>
          
          {/* Main Content */}
          <div className="flex flex-col p-4 gap-4">
            {/* Status Indicator */}
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <div className="font-bold text-red-700">
                ช่อง #{slotNo} เปิดอยู่
              </div>
            </div>
            
            {/* Instructions */}
            <div className="text-center space-y-3">
              <p className="font-medium text-gray-700 leading-relaxed">
                📋 <strong>คำแนะนำ:</strong><br/>
                1. เอายาออกจากช่อง<br/>
                2. ปิดช่องให้แน่น<br/>
                3. กดปุ่ม "ตกลง" เพื่อดำเนินการต่อ
              </p>
              
              <div className="py-2">
                <Loading />
              </div>
              
              <button 
                className="btn bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold px-8 py-3 rounded-lg shadow-lg transition-colors duration-200" 
                onClick={handleCheckLockedBack}
              >
                {isCheckingLock ? (
                  <>
                    <Loading /> กำลังตรวจสอบการปิดช่อง...
                  </>
                ) : (
                  "✓ ตกลง"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DispensingWait;

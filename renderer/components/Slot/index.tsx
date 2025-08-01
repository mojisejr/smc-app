import { useState } from "react";
import LockedSlot from "./locked";
import EmptySlot from "./empty";
import Modal from "../Modals";
import InputSlot from "../Dialogs/inputSlot";
import { useConnectionStatus } from "../../hooks/useConnectionStatus";

interface SlotProps {
  slotData: {
    slotId?: number;
    occupied: boolean;
    hn?: string;
    timestamp?: number;
    opening: boolean;
    isActive: boolean;
  };
  indicator: {
    message: string;
    success: boolean;
    data: {
      Temp1: number;
      Temp2: number;
      Huminity1: number;
      Huminity2: number;
      Battery: number;
    };
  };
}

const Slot = ({ slotData, indicator }: SlotProps) => {
  const [openModal, setOpenModal] = useState<boolean>(false);
  const { isOperationAllowed, isConnected, validateBeforeOperation } = useConnectionStatus();

  async function handleSlot() {
    // Check if slot operation is allowed (not opening, not occupied, active)
    if (!slotData.opening && !slotData.occupied && slotData.isActive) {
      // Check connection before allowing slot interaction
      if (!isConnected) {
        // Connection validation will show error toast
        await validateBeforeOperation('เปิดช่องยา');
        return;
      }

      // Validate connection before operation
      const isValid = await validateBeforeOperation('เปิดช่องยา');
      if (!isValid) {
        return; // Validation failed, error already shown
      }

      // Proceed with slot operation
      if (openModal) {
        setOpenModal(false);
      } else {
        setOpenModal(true);
      }
    }
  }

  // Determine if slot should be disabled
  const isSlotDisabled = !slotData.isActive || !isOperationAllowed;

  return (
    <button 
      onClick={handleSlot} 
      disabled={isSlotDisabled}
      className={`transition-opacity duration-200 ${
        isSlotDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'
      }`}
      title={
        !isConnected 
          ? 'ไม่สามารถใช้งานได้ - ตรวจสอบการเชื่อมต่อ Hardware' 
          : !slotData.isActive 
            ? 'ช่องยานี้ไม่พร้อมใช้งาน' 
            : 'คลิกเพื่อเปิดช่องยา'
      }
    >
      {slotData.occupied ? (
        <LockedSlot
          slotNo={slotData.slotId}
          hn={slotData.hn}
          date={new Date(slotData.timestamp).toLocaleDateString()}
          time={new Date(slotData.timestamp).toLocaleTimeString()}
          temp={!indicator ? 0 : indicator.data.Temp1}
          humid={!indicator ? 0 : indicator.data.Huminity1}
        />
      ) : (
        <EmptySlot
          slotNo={slotData.slotId}
          isActive={slotData.isActive}
          temp={!indicator ? 0 : indicator.data.Temp1}
          humid={!indicator ? 0 : indicator.data.Huminity1}
        />
      )}
      <Modal isOpen={openModal} onClose={handleSlot}>
        <InputSlot slotNo={slotData.slotId} onClose={handleSlot} />
      </Modal>
    </button>
  );
};

export default Slot;

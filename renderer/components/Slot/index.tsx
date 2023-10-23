import { useState } from "react";
import LockedSlot from "./locked";
import EmptySlot from "./empty";
import Modal from "../Modals";
import InputSlot from "../Dialogs/inputSlot";
import ResetSlotOrNot from "../Dialogs/ResetSlotOrNot";

interface SlotProps {
  slotData: {
    slotId?: number;
    occupied: boolean;
    hn?: string;
    timestamp?: number;
    opening: boolean;
  };
}

const Slot = ({ slotData }: SlotProps) => {
  const [openModal, setOpenModal] = useState<boolean>(false);


  function handleSlot() {
    if (!slotData.opening && !slotData.occupied)
      if (openModal) {
        setOpenModal(false);
      } else {
        setOpenModal(true);
      }
  }

  return (
     <button onClick={handleSlot}>
      {slotData.occupied ? (
        <LockedSlot
          slotNo={slotData.slotId}
          hn={slotData.hn}
          date={new Date(slotData.timestamp).toLocaleDateString()}
          time={new Date(slotData.timestamp).toLocaleTimeString()}
        />
      ) : (
        <EmptySlot slotNo={slotData.slotId} />
      )}
      <Modal isOpen={openModal} onClose={handleSlot}>
        <InputSlot slotNo={slotData.slotId} onClose={handleSlot} />
      </Modal>
    
    </button>
   
  );
};

export default Slot;

import { useState } from "react";
import LockedSlot from "./locked";
import EmptySlot from "./empty";
import Modal from "../Modals";
import InputSlot from "../Dialogs/inputSlot";
import { IndicatorParams } from "../../interfaces/indicatorParams";

interface SlotProps {
  slotData: {
    slotId?: number;
    occupied: boolean;
    hn?: string;
    timestamp?: number;
    opening: boolean;
    isActive: boolean;
  };
  indicator: IndicatorParams;
}

const Slot = ({ slotData, indicator }: SlotProps) => {
  const [openModal, setOpenModal] = useState<boolean>(false);

  function handleSlot() {
    if (!slotData.opening && !slotData.occupied && slotData.isActive)
      if (openModal) {
        setOpenModal(false);
      } else {
        setOpenModal(true);
      }
  }

  return (
    <button onClick={handleSlot} disabled={!slotData.isActive}>
      {slotData.occupied ? (
        <LockedSlot
          slotNo={slotData.slotId}
          hn={slotData.hn}
          date={new Date(slotData.timestamp).toLocaleDateString()}
          time={new Date(slotData.timestamp).toLocaleTimeString()}
          temp={!indicator ? 0 : indicator.temp}
          humid={!indicator ? 0 : indicator.humid}
        />
      ) : (
        <EmptySlot
          slotNo={slotData.slotId}
          isActive={slotData.isActive}
          temp={!indicator ? 0 : indicator.temp}
          humid={!indicator ? 0 : indicator.humid}
        />
      )}
      <Modal isOpen={openModal} onClose={handleSlot}>
        <InputSlot slotNo={slotData.slotId} onClose={handleSlot} />
      </Modal>
    </button>
  );
};

export default Slot;

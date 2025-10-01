import { useState } from "react";
import LockedSlot from "./locked";
import EmptySlot from "./empty";
import Modal from "../Modals";
import InputSlot from "../Dialogs/inputSlot";
import { IndicatorParams } from "../../interfaces/indicatorParams";

/**
 * Smart Medication Cart (SMC) - Slot Component
 * Medical Device Compliance: Updated for ESP32 sensor integration
 * 
 * Updated to use new ESP32 interface structure without Battery field
 * Includes error handling UI for medical device environmental monitoring
 */
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
  connectionStatus?: {
    connected: boolean;
    lastUpdate: number;
  };
  isDataStale?: boolean;
  isEnvironmentAcceptable?: boolean;
}

const Slot = ({ 
  slotData, 
  indicator, 
  connectionStatus, 
  isDataStale = false, 
  isEnvironmentAcceptable = true 
}: SlotProps) => {
  const [openModal, setOpenModal] = useState<boolean>(false);

  /**
   * Handle slot interaction with medical device safety checks
   * Prevents slot operation if environmental conditions are not acceptable
   */
  function handleSlot() {
    // Medical device safety: Check environmental conditions before allowing slot operation
    if (!isEnvironmentAcceptable) {
      console.log("MEDICAL: Slot operation blocked due to unacceptable environmental conditions");
      return;
    }

    // Check ESP32 connection status for medical device compliance
    if (connectionStatus && !connectionStatus.connected) {
      console.log("MEDICAL: Slot operation blocked due to ESP32 sensor disconnection");
      return;
    }

    // Original slot logic
    if (!slotData.opening && !slotData.occupied && slotData.isActive) {
      if (openModal) {
        setOpenModal(false);
      } else {
        setOpenModal(true);
      }
    }
  }

  /**
   * Determine if slot should be disabled based on medical device safety requirements
   */
  const isSlotDisabled = (): boolean => {
    return (
      !slotData.isActive || 
      !isEnvironmentAcceptable || 
      (connectionStatus && !connectionStatus.connected) ||
      isDataStale
    );
  };

  /**
   * Get CSS classes for environmental status indication
   */
  const getEnvironmentalStatusClasses = (): string => {
    if (!isEnvironmentAcceptable) {
      return "border-red-500 bg-red-50";
    }
    if (isDataStale || (connectionStatus && !connectionStatus.connected)) {
      return "border-yellow-500 bg-yellow-50";
    }
    return "";
  };

  return (
    <div className="relative">
      {/* Environmental Status Indicator for Medical Device Compliance */}
      {(!isEnvironmentAcceptable || isDataStale || (connectionStatus && !connectionStatus.connected)) && (
        <div className="absolute top-0 right-0 z-10 p-1">
          <div 
            className={`w-3 h-3 rounded-full ${
              !isEnvironmentAcceptable 
                ? "bg-red-500" 
                : "bg-yellow-500"
            }`}
            title={
              !isEnvironmentAcceptable 
                ? "สภาพแวดล้อมไม่เหมาะสม" 
                : isDataStale 
                ? "ข้อมูลเซ็นเซอร์ล้าสมัย" 
                : "เซ็นเซอร์ไม่เชื่อมต่อ"
            }
          />
        </div>
      )}

      {/* Error Message Display */}
      {indicator.error && (
        <div className="absolute bottom-0 left-0 right-0 bg-red-100 text-red-800 text-xs p-1 rounded-b">
          {indicator.error}
        </div>
      )}

      <button 
        onClick={handleSlot} 
        disabled={isSlotDisabled()}
        className={`w-full h-full ${getEnvironmentalStatusClasses()}`}
      >
        {slotData.occupied ? (
          <LockedSlot
            slotNo={slotData.slotId}
            hn={slotData.hn}
            date={new Date(slotData.timestamp).toLocaleDateString()}
            time={new Date(slotData.timestamp).toLocaleTimeString()}
            temp={indicator.temp}
            humid={indicator.humid}
          />
        ) : (
          <EmptySlot
            slotNo={slotData.slotId}
            isActive={slotData.isActive}
            temp={indicator.temp}
            humid={indicator.humid}
          />
        )}
        <Modal isOpen={openModal} onClose={handleSlot}>
          <InputSlot slotNo={slotData.slotId} onClose={handleSlot} />
        </Modal>
      </button>
    </div>
  );
};

export default Slot;

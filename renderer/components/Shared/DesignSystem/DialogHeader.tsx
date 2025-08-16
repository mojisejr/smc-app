import React from "react";
import { IoMdClose } from "react-icons/io";

interface DialogHeaderProps {
  title: string;
  currentStep?: number;
  totalSteps?: number;
  hn?: string;
  onClose?: () => void;
  onEmergencyAction?: () => void;
  emergencyLabel?: string;
  bgColor?: string;
  textColor?: string;
}

const DialogHeader: React.FC<DialogHeaderProps> = ({
  title,
  currentStep,
  totalSteps,
  hn,
  onClose,
  onEmergencyAction,
  emergencyLabel = "!",
  bgColor = "bg-blue-50",
  textColor = "text-blue-700",
}) => {
  return (
    <div
      className={`flex justify-between shadow-xl p-3 font-bold text-xl text-center ${bgColor}`}
    >
      <div className="flex flex-col">
        {currentStep && totalSteps && (
          <span className="text-sm text-gray-600">
            ขั้นตอนที่ {currentStep} ของ {totalSteps}
          </span>
        )}
        <span className={`font-bold ${textColor}`}>
          {hn ? `HN: ${hn}` : title}
        </span>
      </div>

      {(onClose || onEmergencyAction) && (
        <div className="flex gap-1">
          {onEmergencyAction && (
            <button
              onClick={onEmergencyAction}
              className="btn btn-ghost btn-circle btn-sm font-bold text-xl hover:bg-red-100"
              title="ปิดใช้งานช่อง"
            >
              {emergencyLabel}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="btn btn-ghost btn-circle btn-sm text-xl hover:bg-gray-100"
            >
              <IoMdClose />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DialogHeader;

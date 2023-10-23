import { FaLock } from "react-icons/fa";
interface EmptySlotProps {
  slotNo: number;
  isActive: boolean;
}
export const EmptySlot = ({ slotNo, isActive }: EmptySlotProps) => {
  return (
    <div className={`relative min-w-[150px] min-h-[180px] ${isActive ? "bg-[#F6F6F6]" : "bg-[#eee] opacity-30"} shadow-xl rounded-xl p-3`}>
      <div className="flex justify-between">
        <div className="font-bold"></div>
        <div>
          <FaLock className="fill-[#F9324A]" size={25} />
        </div>
      </div>
      <div className="flex flex-col justify-center items-center pt-3">
        <div className="font-bold">Unlock</div>
      </div>
      <div className="absolute bottom-2 right-2 text-[#615858] text-[40px] font-bold">
        {slotNo}
      </div>
    </div>
  );
};

export default EmptySlot;

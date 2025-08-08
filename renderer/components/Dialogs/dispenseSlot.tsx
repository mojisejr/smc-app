import { useForm, SubmitHandler } from "react-hook-form";
import { useDispense } from "../../hooks/useDispense";
import { useCu12States } from "../../hooks/useCu12States";
import { useEffect } from "react";
import { toast } from "react-toastify";
import { useDispensingContext } from "../../contexts/dispensingContext";
type Inputs = {
  hn: string;
  passkey: string;
};

interface ClearSlotProps {
  onClose: () => void;
}

const DispenseSlot = ({ onClose }: ClearSlotProps) => {
  const { dispense } = useDispense();
  const { slots, get } = useCu12States();
  const { setPasskey } = useDispensingContext();

  useEffect(() => {
    get();
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const whichSlot = (hn: string) => {
    const found = slots.filter((slot) => slot.hn == hn);
    return found[0];
  };

  const onSubmit: SubmitHandler<Inputs> = (data) => {
    const slot = whichSlot(data.hn);
    if (slot) {
      dispense({
        slotId: slot.slotId,
        hn: slot.hn,
        timestamp: slot.timestamp,
        passkey: data.passkey,
      });
      setPasskey(data.passkey);
      onClose();
    } else {
      toast(`ไม่พบคนไข้ HN #${data.hn}`, {
        toastId: 3,
        type: "error",
      });
    }
  };

  return (
    <>
      <div className="bg-orange-50/90 backdrop-blur-sm border border-orange-200/50 rounded-xl shadow-lg flex justify-between items-center p-3">
        <span className="font-bold text-orange-800 tracking-wide">จ่ายยา</span>
        <button
          onClick={() => onClose()}
          className="btn btn-circle btn-sm btn-ghost font-bold text-orange-600 hover:bg-orange-100/50 transition-colors duration-200"
        >
          ✕
        </button>
      </div>
      <form
        className="flex gap-3 flex-col p-4 bg-white/80 backdrop-blur-sm rounded-xl"
        onSubmit={handleSubmit(onSubmit)}
      >
        <input
          className="p-3 bg-orange-50/70 backdrop-blur-sm border border-orange-200/30 rounded-lg text-orange-900 placeholder-orange-600/70 focus:bg-orange-50/90 focus:border-orange-300/50 focus:outline-none transition-all duration-200"
          placeholder="รหัสผู้ป่วย"
          {...register("hn", { required: true })}
        />
        <input
          className="p-3 bg-orange-50/70 backdrop-blur-sm border border-orange-200/30 rounded-lg text-orange-900 placeholder-orange-600/70 focus:bg-orange-50/90 focus:border-orange-300/50 focus:outline-none transition-all duration-200"
          placeholder="รหัสผู้ใช้"
          type="password"
          {...register("passkey", { required: true })}
        />
        <button
          className="font-bold p-3 bg-orange-100/70 backdrop-blur-sm border border-orange-200/40 hover:bg-orange-600 hover:text-white text-orange-800 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
          type="submit"
        >
          จ่ายยา
        </button>
      </form>
    </>
  );
};

export default DispenseSlot;

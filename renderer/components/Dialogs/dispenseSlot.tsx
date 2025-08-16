import { useForm, SubmitHandler } from "react-hook-form";
import { useDispense } from "../../hooks/useDispense";
import { useKuStates } from "../../hooks/useKuStates";
import { useEffect } from "react";
import { toast } from "react-toastify";
import { useDispensingContext } from "../../contexts/dispensingContext";
import { DialogBase, DialogHeader, DialogInput, DialogButton } from "../Shared/DesignSystem";

type Inputs = {
  hn: string;
  passkey: string;
};

interface ClearSlotProps {
  onClose: () => void;
}

const DispenseSlot = ({ onClose }: ClearSlotProps) => {
  const { dispense } = useDispense();
  const { slots, get } = useKuStates();
  const { setPasskey } = useDispensingContext();

  useEffect(() => {
    get();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Inputs>();

  const whichSlot = (hn: string) => {
    const found = slots.filter((slot) => slot.hn == hn);
    return found[0];
  };

  const onSubmit: SubmitHandler<Inputs> = (data) => {
    console.log("🔍 DispenseSlot Form Submit - Data:", data);
    
    const slot = whichSlot(data.hn);
    console.log("🔍 DispenseSlot Found Slot:", slot);
    
    if (slot) {
      console.log("✅ DispenseSlot calling dispense function");
      dispense({
        slotId: slot.slotId,
        hn: slot.hn,
        timestamp: slot.timestamp,
        passkey: data.passkey,
      });
      setPasskey(data.passkey);
      onClose();
    } else {
      console.log("❌ DispenseSlot - No slot found for HN:", data.hn);
      toast(`ไม่พบคนไข้ HN #${data.hn}`, {
        toastId: 3,
        type: "error",
      });
    }
  };

  return (
    <DialogBase maxWidth="max-w-[400px]">
      <DialogHeader
        title="จ่ายยา"
        onClose={onClose}
        bgColor="bg-red-50"
        textColor="text-red-700"
      />
      
      <div className="flex flex-col p-4 gap-4">
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit(onSubmit)}
        >
          <DialogInput
            placeholder="รหัสผู้ป่วย"
            error={errors.hn ? "กรุณากรอกรหัสผู้ป่วย" : undefined}
            {...register("hn", { required: true })}
          />
          
          <DialogInput
            type="password"
            placeholder="รหัสผู้ใช้"
            error={errors.passkey ? "กรุณากรอกรหัสผู้ใช้" : undefined}
            {...register("passkey", { required: true })}
          />

          <DialogButton
            type="submit"
            variant="danger"
            icon="💊"
          >
            จ่ายยา
          </DialogButton>
        </form>
      </div>
    </DialogBase>
  );
};

export default DispenseSlot;

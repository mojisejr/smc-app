import { useForm, SubmitHandler } from "react-hook-form";
import { useUnlock } from "../../hooks/useUnlock";
import { useKuStates } from "../../hooks/useKuStates";
import { toast } from "react-toastify";
import {
  DialogBase,
  DialogHeader,
  DialogInput,
  DialogButton,
} from "../Shared/DesignSystem";

type Inputs = {
  hn: string;
  passkey: string;
};

interface InputSlotProps {
  slotNo: number;
  onClose: () => void;
}

const InputSlot = ({ slotNo, onClose }: InputSlotProps) => {
  const { slots } = useKuStates();
  const { unlock } = useUnlock();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Inputs>();

  const checkDuplicate = (hn: string) => {
    const found = slots.find((slot) => slot.hn == hn);
    return found == undefined && slots.length > 0 ? true : false;
  };

  const onSubmit: SubmitHandler<Inputs> = (data) => {
    // console.log("🔍 InputSlot Form Submit - Data:", data);
    // console.log("🔍 InputSlot Form Submit - SlotNo:", slotNo);

    if (data.passkey == "") {
      toast.error("กรุณากรอกรหัสผู้ใช้");
      return;
    }

    if (!checkDuplicate(data.hn)) {
      toast.error("ไม่สามารถลงทะเบียนซ้ำได้");
      return;
    } else {
      // console.log("✅ InputSlot calling unlock function");
      unlock(slotNo, data.hn, data.passkey);
      onClose();
    }
  };

  return (
    <DialogBase maxWidth="max-w-[400px]">
      <DialogHeader title={`ช่อง #${slotNo} - ลงทะเบียน`} onClose={onClose} />

      <div className="flex flex-col p-4 gap-4">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
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

          <DialogButton type="submit" variant="primary" icon="✓">
            ตกลง
          </DialogButton>
        </form>
      </div>
    </DialogBase>
  );
};

export default InputSlot;

import { useForm, SubmitHandler } from "react-hook-form";
import { useUnlock } from "../../hooks/useUnlock";
import { useCu12States } from "../../hooks/useCu12States";
import { toast } from "react-toastify";

type Inputs = {
  hn: string;
  passkey: string;
};

interface InputSlotProps {
  slotNo: number;
  onClose: () => void;
}

const InputSlot = ({ slotNo, onClose }: InputSlotProps) => {
  const { slots } = useCu12States();
  const { unlock } = useUnlock();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const checkDuplicate = (hn: string) => {
    const found = slots.find((slot) => slot.hn == hn);
    return found == undefined && slots.length > 0 ? true : false;
  };

  const onSubmit: SubmitHandler<Inputs> = (data) => {
    // ipcRenderer.invoke(DB.RegisterSlot, slotNo, data.hn, true);

    // Validate slot number for DS12 (12-slot system)
    if (slotNo > 12 || slotNo < 1) {
      toast.error("หมายเลขช่องไม่ถูกต้อง (1-12 เท่านั้น)");
      return;
    }

    if (data.passkey == "") {
      toast.error("กรุณากรอกรหัสผู้ใช้");
      return;
    }

    if (!checkDuplicate(data.hn)) {
      toast.error("ไม่สามารถลงทะเบียนซ้ำได้");
      return;
    } else {
      unlock(slotNo, data.hn, data.passkey);
      onClose();
    }
  };

  return (
    <>
      <div className="">
        <div className="p-3 bg-blue-50/90 backdrop-blur-sm border border-blue-200/50 rounded-xl shadow-lg flex justify-between items-center">
          <span className="font-bold text-blue-800 tracking-wide">ช่อง #{slotNo} - ลงทะเบียน</span>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-circle btn-sm font-bold text-blue-600 hover:bg-blue-100/50 transition-colors duration-200"
          >
            ✕
          </button>
        </div>
        <form
          className="flex flex-col gap-3 p-4 bg-white/80 backdrop-blur-sm rounded-xl"
          onSubmit={handleSubmit(onSubmit)}
        >
          <input
            className="p-3 bg-blue-50/70 backdrop-blur-sm border border-blue-200/30 rounded-lg text-blue-900 placeholder-blue-600/70 focus:bg-blue-50/90 focus:border-blue-300/50 focus:outline-none transition-all duration-200"
            placeholder="รหัสผู้ป่วย"
            {...register("hn", { required: true })}
          />
          <input
            className="p-3 bg-blue-50/70 backdrop-blur-sm border border-blue-200/30 rounded-lg text-blue-900 placeholder-blue-600/70 focus:bg-blue-50/90 focus:border-blue-300/50 focus:outline-none transition-all duration-200"
            placeholder="รหัสผู้ใช้"
            type="password"
            {...register("passkey", { required: true })}
          />

          <button
            className="font-bold p-3 bg-blue-100/70 backdrop-blur-sm border border-blue-200/40 hover:bg-blue-600 hover:text-white text-blue-800 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
            type="submit"
          >
            ตกลง
          </button>
        </form>
      </div>
    </>
  );
};

export default InputSlot;

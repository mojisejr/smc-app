
import { useForm, SubmitHandler } from "react-hook-form";
import { useUnlock } from "../../hooks/useUnlock";
import { useKuStates } from "../../hooks/useKuStates";
import { toast } from "react-toastify";

type Inputs = {
  hn: string;
};

interface InputSlotProps {
  slotNo: number;
  onClose: () => void;
}

const InputSlot = ({ slotNo, onClose }: InputSlotProps) => {
  const { slots, get } = useKuStates();
  const { unlock } = useUnlock();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const checkDuplicate = (hn: string) => {
    const found = slots.find(slot => slot.hn == hn);
    return found == undefined && slots.length > 0 ? true : false;
  };

  const onSubmit: SubmitHandler<Inputs> = (data) => {
    // ipcRenderer.invoke(DB.RegisterSlot, slotNo, data.hn, true);
    if(!checkDuplicate(data.hn)) {
      toast.error("Cannot Input Duplicate HN");
    } else {
      unlock(slotNo, data.hn);
      onClose();
    }
  };

  return (
    <>
      <div className="">
        <div className="p-3 rounded-md shadow-md flex justify-between items-center">
          <span className="font-bold">ช่อง #{slotNo} - ลงทะเบียน</span>
	<button onClick={onClose} className="btn btn-ghost btn-circle btn-sm font-bold">x</button>
        </div>
        <form
          className="flex flex-col gap-2 p-3"
          onSubmit={handleSubmit(onSubmit)}
        >
          <input
            className="p-2 bg-gray-100 rounded-md text-[#000]"
            placeholder="patient Id"
            {...register("hn", { required: true })}
          ></input>
          <button
            className="font-bold p-2 bg-[#eee] hover:bg-[#5495F6] hover:text-white rounded-md"
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

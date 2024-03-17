import { useForm, SubmitHandler } from "react-hook-form";
import { MdQrCodeScanner } from "react-icons/md";
import { ipcRenderer } from "electron";
import { useDispense } from "../../hooks/useDispense";
import { useKuStates } from "../../hooks/useKuStates";
import { useEffect } from "react";
import { toast } from "react-toastify";
// import { IO } from "../../enums/ipc-enums";

type Inputs = {
  hn: string;
};

interface ClearSlotProps {
  onClose: () => void;
}

const DispenseSlot = ({ onClose }: ClearSlotProps) => {
  const { dispense } = useDispense();
  const { slots, get } = useKuStates();

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
      dispense({ slot: slot.slotId, hn: slot.hn, timestamp: slot.timestamp });
      onClose();
    } else {
      toast(`This HN #${data.hn} is occupied nothing, try again!`, {
        toastId: 3,
        type: "error",
      });
    }
  };

  return (
    <>
      <div className="rounded-md shadow-md flex justify-between items-center p-3">
	<span className="font-bold" >Dispensing</span>
	<button onClick={() => onClose()} className="btn btn-circle btn-sm btn-ghost font-bold">x</button>
</div>
      <form
        className="flex gap-2 flex-col p-3 "
        onSubmit={handleSubmit(onSubmit)}
      >
        <input
          className="p-2 bg-gray-100 rounded-md text-[#000]"
          placeholder="patient Id"
          {...register("hn", { required: true })}
        ></input>
        <button
          className="font-bold p-2 bg-[#eee] hover:bg-[#F9324A] hover:text-white rounded-md"
          type="submit"
        >
          Despensing
        </button>
      </form>
    </>
  );
};

export default DispenseSlot;

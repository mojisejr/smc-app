import { ipcRenderer } from "electron";
import { useState } from "react";
import { useForm, SubmitHandler, set } from "react-hook-form";
import { toast } from "react-toastify";
import { useApp } from "../../contexts/appContext";

type Inputs = {
  name: string;
  passkey: string;
};

interface NewUserProps {
  onClose: () => void;
  onSuccess: () => void;
}

const NewUser = ({ onClose, onSuccess }: NewUserProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { admin } = useApp();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setIsLoading(true);

    if (data.name == "" || data.passkey == "") {
      toast.error("กรุณากรอกข้อมูลให้ครบ");
      setIsLoading(false);
      return;
    }

    const result = await ipcRenderer.invoke("create-new-user", {
      name: data.name,
      passkey: data.passkey,
      admin: admin,
    });

    if (result.success) {
      toast.success(result.message);
      setIsLoading(false);
      onSuccess();
      onClose();
    } else {
      toast.error(result.message);
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="">
        <div className="p-3 rounded-md shadow-md flex justify-between items-center">
          <span className="font-bold">สร้างผู้ใช้งานใหม่</span>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-circle btn-sm font-bold"
          >
            x
          </button>
        </div>
        <form
          className="flex flex-col gap-2 p-3"
          onSubmit={handleSubmit(onSubmit)}
        >
          <input
            className="p-2 bg-gray-100 rounded-md text-[#000]"
            placeholder="ชื่อ - นามสกุล"
            {...register("name", { required: true })}
          />
          <input
            className="p-2 bg-gray-100 rounded-md text-[#000]"
            placeholder="รหัสผู้ใช้"
            type="text"
            {...register("passkey", { required: true })}
          />

          <button
            className="font-bold p-2 bg-[#eee] hover:bg-[#5495F6] hover:text-white rounded-md"
            type="submit"
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              "สร้างผู้ใช้งาน"
            )}
          </button>
        </form>
      </div>
    </>
  );
};

export default NewUser;

import { useForm, SubmitHandler } from "react-hook-form";
import { ipcRenderer } from "electron";
import { toast } from "react-toastify";
import { useApp } from "../../contexts/appContext";
import { useEffect } from "react";
import { useState } from "react";
import { AuthRequest, AuthResponse } from "../../interfaces/auth";

type Inputs = {
  passkey: string;
};


const AuthDialog = () => {
  const { setUser } = useApp();
  const [loading, setLoading] = useState(false)


  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    ipcRenderer.on("login-res", (event, user: AuthResponse) => {
      if (user == null) {
        toast.error(`ผู้ใช้งานไม่ถูกต้อง`, { toastId: 99, type: "error" });
        setLoading(false);
      } else {
        toast.success(`เข้าสู่ระบบแล้ว ${user.name}`, { toastId: 99, type: "success" });
        setUser(user);
        setLoading(false);
      }
    });
    return () => {
      ipcRenderer.removeAllListeners("login-res");
    };
  }, [])

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setLoading(true)

    if(data.passkey == "" || data.passkey == null) {
      setLoading(false);
      toast.error(`กรุณาใส่ข้อมูลให้ครบถ้วน`, { toastId: 99, type: "error" });
      return;
    }

    const req: AuthRequest =  {
      passkey: data.passkey
    }

    ipcRenderer.invoke("login-req", req);
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="text-xl font-bold shadow-md p-3 rounded-md">เข้าสู่ระบบ</div>
        <form
          className="flex flex-col p-3 gap-2"
          onSubmit={handleSubmit(onSubmit)}
        >
          <input
            className="p-2 bg-gray-100 rounded-md text-[#000]"
            placeholder="STAFF ID"
            {...register("passkey", { required: true })}
          ></input>
          <button
          disabled={loading}
            className="font-bold p-2 bg-[#eee] hover:bg-[#5495F6] hover:text-white rounded-md"
            type="submit"
          >
            <>เข้าสู่ระบบ</>{loading && <div className="loading loading-spinner loading-sm"></div>}
          </button>
        </form>
      </div>
    </>
  );
};

export default AuthDialog;

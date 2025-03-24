import { useForm, SubmitHandler } from "react-hook-form";
import { ipcRenderer } from "electron";
import { toast } from "react-toastify";
import { useApp } from "../../contexts/appContext";
import { useEffect } from "react";
import { useState } from "react";
import { AuthRequest, AuthResponse } from "../../interfaces/auth";
import { useRouter } from "next/router";

type Inputs = {
  passkey: string;
};

interface AuthDialogProps {
  onClose: () => void;
}

const AuthDialog = ({ onClose }: AuthDialogProps) => {
  const { replace } = useRouter();
  const { setAdmin } = useApp();
  const [loading, setLoading] = useState(false);

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
        setAdmin(null);
        setLoading(false);
        onClose();
      } else if (user && user.role !== "ADMIN") {
        toast.error(`ผู้ใช้งานไม่ถูกต้อง`, { toastId: 99, type: "error" });
        setAdmin(null);
        setLoading(false);
        onClose();
      } else {
        toast.success(`เข้าสู่ระบบแล้ว ${user.name}`, {
          toastId: 99,
          type: "success",
        });
        setAdmin(user.name);
        void replace("/management");
        setLoading(false);
      }
    });
    return () => {
      ipcRenderer.removeAllListeners("login-res");
    };
  }, []);

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setLoading(true);

    if (data.passkey == "" || data.passkey == null) {
      setLoading(false);
      toast.error(`กรุณาใส่ข้อมูลให้ครบถ้วน`, { toastId: 99, type: "error" });
      return;
    }

    const req: AuthRequest = {
      passkey: data.passkey,
    };

    ipcRenderer.invoke("login-req", req);
  };

  return (
    <>
      <div className="flex flex-col gap-3 text-[#000]">
        <div className="text-xl font-bold shadow-md p-3 rounded-md flex justify-between items-center">
          <span className="font-bold">เข้าสู่ระบบ</span>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-circle btn-sm font-bold"
          >
            x
          </button>
        </div>
        <form
          className="flex flex-col p-3 gap-2"
          onSubmit={handleSubmit(onSubmit)}
        >
          <input
            type="password"
            className="p-2 bg-gray-100 rounded-md text-[#000]"
            placeholder="รหัสผ่านผู้ดูแลระบบ"
            {...register("passkey", { required: true })}
          ></input>
          <button
            disabled={loading}
            className="font-bold p-2 bg-[#eee] hover:bg-[#5495F6] hover:text-white rounded-md"
            type="submit"
          >
            <>เข้าสู่ระบบ</>
            {loading && (
              <div className="loading loading-spinner loading-sm"></div>
            )}
          </button>
        </form>
      </div>
    </>
  );
};

export default AuthDialog;

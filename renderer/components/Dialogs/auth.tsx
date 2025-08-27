import { useForm, SubmitHandler } from "react-hook-form";
import { ipcRenderer } from "electron";
import { toast } from "react-toastify";
import { useApp } from "../../contexts/appContext";
import { useEffect } from "react";
import { useState } from "react";
import { AuthRequest, AuthResponse } from "../../interfaces/auth";
import { useRouter } from "next/router";
import { DialogBase, DialogHeader, DialogInput, DialogButton } from "../Shared/DesignSystem";

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
    formState: { errors },
  } = useForm<Inputs>();

  useEffect(() => {
    ipcRenderer.on("login-res", (_, user: AuthResponse) => {
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
    // Debug log removed for production
    setLoading(true);

    if (data.passkey == "" || data.passkey == null) {
      // Debug log removed for production
      setLoading(false);
      toast.error(`กรุณาใส่ข้อมูลให้ครบถ้วน`, { toastId: 99, type: "error" });
      return;
    }

    const req: AuthRequest = {
      passkey: data.passkey,
    };

    // Debug log removed for production
    ipcRenderer.invoke("login-req", req);
  };

  return (
    <DialogBase maxWidth="max-w-[400px]">
      <DialogHeader
        title="เข้าสู่ระบบ"
        onClose={onClose}
      />
      
      <div className="flex flex-col p-4 gap-4">
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit(onSubmit)}
        >
          <DialogInput
            type="password"
            placeholder="รหัสผ่านผู้ดูแลระบบ"
            error={errors.passkey ? "กรุณากรอกรหัสผ่าน" : undefined}
            {...register("passkey", { required: true })}
          />
          
          <DialogButton
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading}
            icon="🔐"
          >
            เข้าสู่ระบบ
          </DialogButton>
        </form>
      </div>
    </DialogBase>
  );
};

export default AuthDialog;

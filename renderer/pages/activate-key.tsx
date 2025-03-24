import { ipcRenderer } from "electron";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { useForm } from "react-hook-form";

type inputType = {
  key: string;
};

export default function ActivatePage() {
  const { replace } = useRouter();
  const { register, handleSubmit } = useForm<inputType>();
  const [isLoading, setLoading] = useState<boolean>(false);

  const onSubmit = handleSubmit(async (data: inputType) => {
    setLoading(true);
    const key = data.key;

    if (!key) {
      alert("กรุณาใส่ Activation key");
    }
    const result = await ipcRenderer.invoke("activate-key", { key });

    if (!result) {
      alert("ไม่สามารถ activate ได้");
    }

    const activated = await ipcRenderer.invoke("check-activation-key");

    if (activated) {
      alert("Activate สำเร็จ ออกจากโปรแกรมแล้วเข้าใหม่อีกครั้ง");
      replace("/home");
    }

    setLoading(false);
  });

  return (
    <div className="w-full flex h-screen justify-center items-center">
      <form onSubmit={onSubmit} className="flex gap-3 flex-col">
        <div className="form-control">
          <label className="label label-text">
            กรุณาใส่ Activation key ที่ได้รับจากบริษัท
          </label>
          <input
            {...register("key", { required: true })}
            className="input input-bordered min-w-[600px]"
            type="text"
            placeholder="INPUT ACTIVATION KEY HERE"
          ></input>
        </div>
        <button disabled={isLoading} type="submit" className="btn btn-primary">
          {isLoading ? "Activating..." : "Activate"}
        </button>
      </form>
    </div>
  );
}

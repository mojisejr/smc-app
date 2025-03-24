import React, { useEffect, useState } from "react";
import Head from "next/head";
import Image from "next/image";

import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Indicators from "../components/Indicators/indicators";
import { useSetting } from "../hooks/useSetting";
import { useRouter } from "next/router";
import { useRef } from "react";
import { ipcRenderer } from "electron";

function Setting() {
  const { replace } = useRouter();
  const { setting, updateSetting } = useSetting();
  const [enableEdit, setEnableEdit] = useState(true);
  const [loading, setLoading] = useState(false);

  const portRef = useRef<HTMLInputElement>(null);
  const baudrateRef = useRef<HTMLInputElement>(null);
  const servCodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ipcRenderer.on("set-setting-res", (event, setting) => {
      if (setting == null || setting == undefined) {
        toast.error("ไม่สามารถบันทึกข้อมูลได้");
        setLoading(false);
        return;
      }
      toast.success("บันทึกข้อมูลสำเร็จ");
      ipcRenderer.invoke("init", { init: true });
      replace("/home");
      setLoading(false);
    });

    return () => {
      ipcRenderer.removeAllListeners("set-setting-res");
    };
  }, []);

  const handleEnableEdit = () => {
    if (!enableEdit) {
      portRef.current!.value = setting?.ku_port!;
      baudrateRef.current!.value = setting?.ku_baudrate.toString()!;
    }
    setEnableEdit(!enableEdit);
  };

  const handleUpdateSetting = (e: React.MouseEvent<HTMLButtonElement>) => {
    setLoading(true);
    e.preventDefault();

    const port =
      portRef.current?.value == "" ? setting?.ku_port : portRef.current?.value;
    const baudrate =
      baudrateRef.current?.value == ""
        ? setting?.ku_baudrate.toString()
        : baudrateRef.current?.value;
    const isValidCode =
      servCodeRef.current?.value == ""
        ? false
        : setting?.service_code == servCodeRef.current?.value;

    if (!isValidCode) {
      toast.error("รหัสบริการไม่ถูกต้อง");
      setLoading(false);
      return;
    }

    if (port == "" || baudrate == "") {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    updateSetting({
      ku_port: port,
      ku_baudrate: parseInt(baudrate),
    });
  };

  return (
    <>
      <Head>
        <title>Smart Medication Cart V1.0</title>
      </Head>
      <div className=" grid grid-cols-12 text-2xl text-center h-screen overflow-y-auto">
        <div className="col-span-2 flex flex-col justify-between">
          <div className="w-full px-3 py-10 flex flex-col gap-3 justify-center items-center">
            <Image
              src="/images/deprecision.png"
              width={86}
              height={85}
              alt="logo"
            />

            <div className="w-full px-3 flex  flex-col gap-2 justify-start items-center">
              <Indicators />
            </div>
          </div>
        </div>
        <div className="col-span-10 bg-[#F3F3F3] rounded-l-[50px]">
          <div className="w-full p-[2rem] flex flex-col gap-[1.2rem] overflow-y-auto"></div>
          {/**Content Goes here */}
          <div>Setting</div>
          <div className="flex w-full justify-center">
            <form className="form max-w-md flex-col gap-2 flex">
              <div className="form-control">
                <label className="label label-text text-secondary">
                  เชื่อมต่ออยู่กับ port
                </label>
                <input
                  ref={portRef}
                  type="text"
                  className="input input-text w-full"
                  placeholder={setting?.ku_port}
                  // value={setting?.ku_port}
                  readOnly={enableEdit}
                />
              </div>
              <div>
                <label className="label label-text text-secondary">
                  BaudRate
                </label>
                <input
                  ref={baudrateRef}
                  type="text"
                  className="input input-text w-full"
                  placeholder={setting?.ku_baudrate.toString()}
                  // value={setting?.ku_baudrate}
                  readOnly={enableEdit}
                />
              </div>
              <div>
                <label className="label label-text text-secondary">
                  BaudRate
                </label>
                <input
                  ref={servCodeRef}
                  type="password"
                  className="input input-text w-full"
                  placeholder="service code"
                  readOnly={enableEdit}
                />
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  disabled={loading}
                  type="button"
                  onClick={handleEnableEdit}
                  className="btn btn-warning"
                >
                  {enableEdit ? "แก้ไข" : "ยกเลิก"}{" "}
                </button>
                <button
                  disabled={loading || enableEdit}
                  type="button"
                  onClick={(e) => handleUpdateSetting(e)}
                  className="btn"
                >
                  บันทึก
                </button>
              </div>
              <span className="text-sm text-error">
                บันทึกข้อมูลแล้วกรุณาปิดแล้วเปิดโปรแกรมใหม่อีกครั้ง
              </span>
            </form>
          </div>
        </div>
      </div>
      <ToastContainer
        limit={1}
        autoClose={1000}
        position="top-center"
        hideProgressBar
      />
    </>
  );
}

export default Setting;

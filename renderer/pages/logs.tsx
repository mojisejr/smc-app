import React, { useEffect, useState } from "react";
import Head from "next/head";
import Image from "next/image";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Loading from "../components/Shared/Loading";

import { ipcRenderer } from "electron";
import Navbar from "../components/Shared/Navbar";

function Document() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // useEffect(() => {
  //   setLoading(true);
  //   ipcRenderer.invoke("get_logs");
  //   ipcRenderer.on("retrive_logs", (event, payload) => {
  //     setLoading(false);
  //     setLogs(payload);
  //   });
  // }, []);

  useEffect(() => {
    setLoading(true);
    // ipcRenderer.invoke("get_dispensing_logs");
    // ipcRenderer.on("retrive_dispensing_logs", (event, payload) => {
    //   setLoading(false);
    //   setLogs(payload);
    // });
    const fetchLogs = async () => {
      const logs = await ipcRenderer.invoke("get_dispensing_logs");
      setLogs(logs);
      setLoading(false);
    };
    fetchLogs();
  }, []);

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

            <Navbar active={4} />
          </div>
        </div>
        <div className="col-span-10 bg-[#F3F3F3] rounded-l-[50px] text-[#000]">
          <div className="w-full h-[80vh]   p-[2rem] flex flex-col gap-[1.2rem] overflow-auto">
            {/**Content Goes here */}
            {loading ? (
              <Loading />
            ) : (
              <table className="table">
                <thead>
                  <tr className="text-[#000]">
                    <th className="font-bold">วันที่</th>
                    <th className="font-bold">ช่องยาเลขที่</th>
                    <th className="font-bold">สถานะ</th>
                    <th className="font-bold">ผู้ใช้งาน</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length <= 0
                    ? null
                    : logs.map((log) => (
                        <tr key={log.id}>
                          <td>
                            {new Date(log.createdAt).toLocaleDateString()} :{" "}
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </td>
                          <td>{log.slotId}</td>
                          <td>{log.message}</td>
                          <td>{log.user}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            )}
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

export default Document;

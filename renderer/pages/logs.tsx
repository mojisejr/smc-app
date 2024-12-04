import React, { useEffect, useState } from "react";
import Head from "next/head";
import Image from "next/image";

import { BsBook, BsHouseDoor, BsQuestionCircle } from "react-icons/bs";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Link from "next/link";
import Loading from "../components/Shared/Loading";

import { useApp } from "../contexts/appContext";
import Indicator from "../components/Indicators/baseIndicator";
import { ipcRenderer } from "electron";
import Navbar from "../components/Shared/Navbar";
import Indicators from "../components/Indicators/indicators";
import Modal from "../components/Modals";
import ReactivateAllSlots from "../components/Dialogs/ReactivateAllSlots";

function Document() {
    const { user } = useApp();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    const [reactiveModal, setReactiveModal] = useState(false);

    function handleReactiveAllSlots() {
      setReactiveModal(true);
    }
    useEffect(() => {
        setLoading(true)
        ipcRenderer.invoke("get_logs");
        ipcRenderer.on("retrive_logs", (event, payload) => {
            setLoading(false);
            setLogs(payload);
        })
    },[]);


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

            <div className="w-full px-3 flex  flex-col gap-2 justify-start items-center">
              <Indicators /> 
            </div>
          </div>
        </div>
        <div className="col-span-10 bg-[#F3F3F3] rounded-l-[50px]">
          <div className="w-full h-[80vh]   p-[2rem] flex flex-col gap-[1.2rem] overflow-y-auto">
            {/**Content Goes here */} 
            { loading ? <Loading /> : <table className="table">
                <thead>
                    <tr>
                        <th  className="font-bold">timestamp</th>
                        <th  className="font-bold">message</th>
                        <th  className="font-bold">log-id</th>
                    </tr>
                </thead>
                <tbody> 
                    {logs.length <= 0 ? null : logs.map((log) => <tr key={log.id}>
                        <td>{new Date(log.createdAt).toLocaleDateString()} : {new Date(log.createdAt).toLocaleTimeString()}</td>
                        <td>{log.message}</td>
                        <td>{log.id}</td>
                        </tr>)}
                </tbody>
            </table> }
          </div>
          { user !== undefined && user?.role == "ADMIN" ? <div className="flex bg-gray-300 p-3 my-2">
            <button className="btn btn-error" onClick={() => handleReactiveAllSlots()}>Reactive All Slots</button>
          </div> : null }
        </div>
      </div>
      <ToastContainer
        limit={1}
        autoClose={1000}
        position="top-center"
        hideProgressBar
      />
      <Modal isOpen={reactiveModal} onClose={() => setReactiveModal(false)}>
        <ReactivateAllSlots onClose={() => setReactiveModal(false)}  />
      </Modal>
   
    
    </>
  );
}

export default Document;

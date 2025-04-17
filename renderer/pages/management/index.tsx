import React, { useEffect, useState } from "react";
import Head from "next/head";
import Image from "next/image";

import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Navbar from "../../components/Shared/Navbar";
import { useApp } from "../../contexts/appContext";
import { useRouter } from "next/router";
import { ipcRenderer } from "electron";
import { useSetting } from "../../hooks/useSetting";
import Modal from "../../components/Modals";
import NewUser from "../../components/Dialogs/newUser";
import SlotSetting from "../../components/Settings/SlotSetting";
import UserSetting from "../../components/Settings/UserSetting";
import SystemSetting from "../../components/Settings/SystemSetting";
import LogsSetting from "../../components/Settings/LogsSetting";

export default function Document() {
  const { admin } = useApp();
  const { replace } = useRouter();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [portList, setPortList] = useState<any[]>([]);
  const [userList, setUserList] = useState<any[]>([]);
  const [slotList, setSlotList] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [openNewUser, setOpenNewUser] = useState<boolean>(false);
  const [selectedPort, setSelectedPort] = useState<string>("");
  const { setting, getSetting } = useSetting();

  useEffect(() => {
    if (activeTab === 2) {
      fetchPortList();
    }

    if (activeTab === 1) {
      fetchUser();
    }

    if (activeTab === 0) {
      getAllSlots();
    }

    if (activeTab === 3) {
      fetchLogs();
    }
  }, [activeTab]);

  const fetchPortList = async () => {
    const portList = await ipcRenderer.invoke("get-port-list");
    setPortList(portList);
  };

  const fetchUser = async () => {
    const users = await ipcRenderer.invoke("get-user");
    setUserList(users);
  };

  const getAllSlots = async () => {
    const slots = await ipcRenderer.invoke("get-all-slots");
    setSlotList(slots);
  };

  const fetchLogs = async () => {
    const logs = await ipcRenderer.invoke("get_dispensing_logs");
    setLogs(logs);
  };

  const tabs = [
    { id: 0, name: "จัดการช่องยา" },
    { id: 1, name: "จัดการผู้ใช้งาน" },
    { id: 2, name: "จัดการการตั้งค่าระบบ" },
    { id: 3, name: "จัดการ Logs" },
  ];

  useEffect(() => {
    try {
      if (!admin) {
        replace("/home").catch((error) => {
          console.error("Navigation error:", error);
        });
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error in auth check:", error);
      setIsLoading(false);
    }
  }, [admin, replace]);

  const exportLogHandler = async () => {
    const filename = await ipcRenderer.invoke("export_logs");
    toast.success(`ส่ง logs ทั้งหมดไปยังไฟล์ ${filename}`);
  };

  const handleDeactivateAll = async () => {
    await ipcRenderer.invoke("deactivate-all", { name: admin });
    await getAllSlots();
    toast.success("ยกเลิกการใช้งานระบบทั้งหมด");
  };

  const handleReactivateAll = async () => {
    await ipcRenderer.invoke("reactivate-all", {
      name: admin,
    });
    await getAllSlots();
    toast.success("เปิดใช้งานระบบทั้งหมด");
  };

  const handleDeactivateAdmin = async (slotId: number) => {
    await ipcRenderer.invoke("deactivate-admin", {
      name: admin,
      slotId: slotId,
    });
    await getAllSlots();
    toast.success(`ยกเลิกการใช้งานช่องยาช่องที่ ${slotId}`);
  };

  const handleReactivateAdmin = async (slotId: number) => {
    await ipcRenderer.invoke("reactivate-admin", {
      name: admin,
      slotId: slotId,
    });
    await getAllSlots();
    toast.success(`เปิดใช้งานช่องยาช่องที่ ${slotId}`);
  };

  const handleNewUser = () => {
    if (userList.length < setting.max_log_counts) {
      setOpenNewUser(true);
    } else {
      toast.error("จำนวนผู้ใช้งานสูงสุด");
    }
  };

  const handleDeleteUser = async (id: string) => {
    await ipcRenderer.invoke("delete-user", { id: id, admin: admin });
    await fetchUser();
    toast.success("ลบผู้ใช้งานเรียบร้อย");
  };

  const handleSetSelectedPort = async (selectedPort: string) => {
    if (selectedPort == null || !selectedPort) {
      toast.error("กรุณาเลือก port");
      return;
    }
    await ipcRenderer.invoke("set-selected-port", {
      port: selectedPort,
      admin: admin,
    });
    await fetchPortList();
    getSetting();
    toast.success("เปลี่ยน port เรียบร้อย");
  };

  const handleSetIndicatorPort = async (selectedPort: string) => {
    if (selectedPort == null || !selectedPort) {
      toast.error("กรุณาเลือก port");
      return;
    }
    await ipcRenderer.invoke("set-indicator-port", {
      port: selectedPort,
      admin: admin,
    });
    await fetchPortList();
    getSetting();
    toast.success("เปลี่ยน port เรียบร้อย");
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="alert alert-error shadow-lg max-w-md">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current flex-shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-xl">ไม่มีสิทธิ์เข้าถึงหน้านี้</span>
          </div>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <SlotSetting
            slotList={slotList}
            handleDeactivateAll={handleDeactivateAll}
            handleReactivateAll={handleReactivateAll}
            handleDeactivateAdmin={handleDeactivateAdmin}
            handleReactivateAdmin={handleReactivateAdmin}
          />
        );
      case 1:
        return (
          <UserSetting
            userList={userList}
            handleNewUser={handleNewUser}
            handleDeleteUser={handleDeleteUser}
            setting={setting}
          />
        );
      case 2:
        return (
          <SystemSetting
            setting={setting}
            portList={portList}
            selectedPort={selectedPort}
            handleSetSelectedPort={handleSetSelectedPort}
            handleSetIndicatorPort={handleSetIndicatorPort}
            setSelectedPort={setSelectedPort}
          />
        );
      case 3:
        return (
          <LogsSetting
            logs={logs}
            setting={setting}
            exportLogHandler={exportLogHandler}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Head>
        <title>Smart Medication Cart V1.0</title>
      </Head>
      <div className=" grid grid-cols-12 text-2xl text-center h-screen">
        <div className="col-span-2 flex flex-col justify-between">
          <div className="w-full px-3 py-10 flex flex-col gap-3 justify-center items-center">
            <Image
              src="/images/deprecision.png"
              width={86}
              height={85}
              alt="logo"
            />

            <Navbar active={5} />
          </div>
        </div>
        <div className="col-span-10 bg-[#F3F3F3] rounded-l-[50px]">
          <div className="w-full h-[80vh] p-[2rem] flex flex-col gap-[1.2rem]">
            {/**Content Goes here */}
            <div className="w-full h-full">
              <div className="tabs tabs-boxed bg-white justify-center gap-2">
                {tabs.map((tab) => (
                  <a
                    key={tab.id}
                    className={`tab tab-lg  ${
                      activeTab === tab.id ? "bg-blue-500 text-white" : ""
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.name}
                  </a>
                ))}
              </div>

              <div className="mt-6 p-4">{renderTabContent()}</div>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer
        limit={1}
        autoClose={1000}
        position="top-center"
        hideProgressBar
      />
      <Modal isOpen={openNewUser} onClose={() => setOpenNewUser(false)}>
        <NewUser
          onClose={() => setOpenNewUser(false)}
          onSuccess={() => fetchUser()}
        />
      </Modal>
    </>
  );
}

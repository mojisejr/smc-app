import React from "react";
import Head from "next/head";
import Image from "next/image";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Navbar from "../components/Shared/Navbar";
import UserGuideView from "../components/UserGuide/UserGuideView";

// Modern User Guide Documentation System
// Replaces basic documentation with comprehensive, hardware-adaptive user guide

function Document() {
  return (
    <>
      <Head>
        <title>Smart Medication Cart V1.0 - คู่มือการใช้งาน</title>
      </Head>
      <div className="grid grid-cols-12 text-2xl text-center h-screen">
        <div className="col-span-2 flex flex-col justify-between">
          <div className="w-full px-3 py-10 flex flex-col gap-3 justify-center items-center">
            <Image
              src="/images/deprecision.png"
              width={86}
              height={85}
              alt="Smart Medication Cart Logo"
            />

            <Navbar active={2} />
          </div>
        </div>
        <div className="col-span-10 bg-[#F3F3F3] rounded-l-[50px]">
          <div className="w-full h-full p-[2rem] flex flex-col gap-[1.2rem] overflow-y-auto">
            {/* Modern User Guide Component with hardware detection and comprehensive content */}
            <UserGuideView />
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

import React from "react";
import Head from "next/head";
import Image from "next/image";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Navbar from "../components/Shared/Navbar";

// import Indicators from "../components/Indicators/indicators";

function Document() {
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

            <Navbar active={2} />

            {/* <div className="w-full px-3 flex  flex-col gap-2 justify-start items-center">
              <Indicators />
            </div> */}
          </div>
        </div>
        <div className="col-span-10 bg-[#F3F3F3] rounded-l-[50px]">
          <div className="w-full h-full p-[2rem] flex flex-col gap-[2rem] overflow-y-auto">
            <h1 className="text-5xl">คู่มือการใช้งาน</h1>
            <div className="h-[80h] overflow-auto">
              <div className="text-start text-xl underline">
                ขั้นตอนการจัดยา
              </div>
              <ul className="flex items-start wrap flex-col text-sm">
                <li>1. select the slot card that has "Red Locked indicator"</li>
                <li>
                  2. input the HN number and click "Unlock button" system will
                  open the drug slot at the selected slot on screen
                </li>
                <li>
                  3. put the drugs in to the slot and slide the slot back
                  securely
                </li>
              </ul>

              <div className="text-start text-xl underline">
                ขั้นตอนการจ่ายยา
              </div>
              <ul className="flex items-start wrap flex-col text-sm">
                <li>
                  1. select the slot card that has "Green Locked" that means
                  there are some drugs inside
                </li>
                <li>
                  2. input the HN number and click "Unlock button" system will
                  open the drug slot at the selected slot on screen
                </li>
                <li>
                  3. put the drugs out of the slot and slide the slot back
                  securely
                </li>
                <li>
                  4. select "Clear Slot" button to clear information an make the
                  selected slot back to avaliable state
                </li>
                <li>5. or select "Continue" button to keep the infomation</li>
              </ul>
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
    </>
  );
}

export default Document;

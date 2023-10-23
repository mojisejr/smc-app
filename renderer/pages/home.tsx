import React, { useEffect, useState } from "react";
import Head from "next/head";
import Slot from "../components/Slot";
import Image from "next/image";

import { BsBook, BsGear, BsHouseDoor, BsQuestionCircle } from "react-icons/bs";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Modal from "../components/Modals";
import Auth from "../components/Dialogs/auth";
import LockWait from "../components/Dialogs/lockWait";
import DispenseSlot from "../components/Dialogs/dispenseSlot";
import DispensingWait from "../components/Dialogs/dispensingWait";

import ClearOrContinue from "../components/Dialogs/clearOrContinue";
import Link from "next/link";
import { useKuStates } from "../hooks/useKuStates";
import Loading from "../components/Shared/Loading";
import { useDispense } from "../hooks/useDispense";
import { useUnlock } from "../hooks/useUnlock";
import { useApp } from "../contexts/appContext";
import { BsUnlockFill } from 'react-icons/bs'
import Indicator from "../components/Indicators/baseIndicator";
import Navbar from "../components/Shared/Navbar";
import Indicators from "../components/Indicators/indicators";

function Home() {
  const { slots, canDispense } = useKuStates();
  const { unlocking } = useUnlock();
  const { dispensing } = useDispense();
  const [openAuthModal, setOpenAuthModal] = useState<boolean>(true);
  const [openDispenseModal, setOpenDispenseModal] = useState<boolean>(false);
  const [closeClearOrCon, setCloseClearOrCon] = useState<boolean>(false);
  const { user, logged } = useApp();

  const handleCloseClearOrCon = () => {
    setCloseClearOrCon(true);
  };

  const handleDispenseButton = () => {
    setOpenDispenseModal(true);
  };

  useEffect(() => {
    if (dispensing.dispensing) {
      setCloseClearOrCon(false);
    }
  }, [dispensing]);

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
            <Navbar active={1}/>
              <div className="w-full px-4 flex  flex-col gap-2 justify-start items-center">
                <Indicators />
              </div>
          </div>
        </div>
        <div className="col-span-10 bg-[#F3F3F3] rounded-l-[50px]">
          <div className="w-full h-full p-[2rem] flex flex-col gap-[1.2rem] overflow-y-auto">
            <>
              {slots === undefined ? (
                <div>Error: undefined</div>
              ) : (
                <>
                  {slots.length <= 0 ? (
                    <div className="min-h-[300px] flex justify-center items-center">
                      <Loading />
                    </div>
                  ) : (
                    <ul className="grid grid-cols-5 gap-2 min-h-[70vh] place-content-start">
                      {slots.sort((a,b) => a.slotId - b.slotId).map((s, index) => (
                        <Slot key={index} slotData={s} />
                      ))}
                    </ul>
                  )}
                </>
              )}
            </>
            <button
              disabled={!canDispense}
              onClick={() => handleDispenseButton()}
              className=" flex items-center gap-2 absolute bottom-10 right-10 text-[36px]  px-5 py-3 font-bold bg-[#eee] rounded-xl shadow-xl hover:bg-[#5495F6] hover:text-[#fff] disabled:text-[#ddd] disabled:bg-[#eee]"
            >
              <BsUnlockFill  />
              Dispense
            </button>

           
          </div>
        </div>
      </div>
      <ToastContainer
        limit={1}
        autoClose={1000}
        position="top-center"
        hideProgressBar
      />
      {!user ? (
        <>
          <Modal
            isOpen={openAuthModal}
            onClose={() => {
              user ? setOpenAuthModal(false) : null;
            }}
          >
            <Auth />
          </Modal>
        </>
      ) : null}
      <Modal
        isOpen={openDispenseModal}
        onClose={() => setOpenDispenseModal(false)}
      >
        <DispenseSlot onClose={() => setOpenDispenseModal(false)} />
      </Modal>
      <Modal isOpen={unlocking.unlocking} onClose={() => {}}>
        {/* <Modal isOpen={true} onClose={() => {}}> */}
        <LockWait slotNo={unlocking.slot} hn={unlocking.hn} />
      </Modal>
      <Modal isOpen={dispensing.dispensing} onClose={() => {}}>
        {dispensing ? (
          <DispensingWait slotNo={dispensing.slot} hn={dispensing.hn} />
        ) : null}
      </Modal>
      <Modal
        isOpen={
          closeClearOrCon ? false : !dispensing.dispensing && dispensing.reset
        }
        onClose={() => {}}
      >
        <ClearOrContinue
          slotNo={dispensing.slot}
          hn={dispensing.hn}
          onClose={handleCloseClearOrCon}
        />
      </Modal>
    </>
  );
}

export default Home;

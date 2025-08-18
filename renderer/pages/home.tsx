import React, { useEffect, useState } from "react";
import Head from "next/head";
import Slot from "../components/Slot";
import Image from "next/image";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Modal from "../components/Modals";
import LockWait from "../components/Dialogs/lockWait";
import DispensingWait from "../components/Dialogs/dispensingWait";

import { useKuStates } from "../hooks/useKuStates";
import Loading from "../components/Shared/Loading";
import { useDispense } from "../hooks/useDispense";
import { useUnlock } from "../hooks/useUnlock";
import Navbar from "../components/Shared/Navbar";
import DeActivate from "../components/Dialogs/Deactivate";
import { useIndicator } from "../hooks/useIndicator";
import { generateSlotArray, getResponsiveGridConfig } from "../utils/getDisplaySlotConfig";

// Generate slots dynamically based on hardware configuration
const mockSlots = generateSlotArray();

function Home() {
  const { slots } = useKuStates();
  const { unlocking } = useUnlock();
  const { dispensing } = useDispense();
  const { indicator } = useIndicator();
  const [closeClearOrCon, setCloseClearOrCon] = useState<boolean>(false);
  const [closeLockWait, setCloseLockWait] = useState<boolean>(false);
  const [openDeactivate, setOpenDeactivate] = useState<boolean>(false);
  
  // Get responsive grid configuration based on hardware
  const { containerClass, gridClass, gapClass } = getResponsiveGridConfig();

  useEffect(() => {
    if (unlocking.unlocking) {
      setCloseLockWait(false);
    }
  }, [unlocking]);

  useEffect(() => {
    if (dispensing.continue) {
      console.log(
        "DISPENSING DIALOG TRACE: CLEAR OR CON FLAG",
        dispensing.continue
      );
      setCloseClearOrCon(true);
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
            <Navbar active={1} />
            {/* <div className="w-full px-4 flex  flex-col gap-2 justify-start items-center">
              <Indicators />
            </div> */}
          </div>
        </div>
        <div className="col-span-10 bg-[#F3F3F3] rounded-l-[50px]">
          <div className="w-full h-full p-[2rem] overflow-y-auto">
            <>
              {mockSlots === undefined ? (
                <div>Error: undefined</div>
              ) : (
                <>
                  {mockSlots.length <= 0 ? (
                    <div className="min-h-[300px] flex justify-center items-center">
                      <Loading />
                    </div>
                  ) : (
                    <ul className={`!${gridClass} ${gapClass} ${containerClass}`}>
                      {mockSlots
                        .map((s, index) => {
                          return {
                            ...s,
                            ...slots[index],
                          };
                        })
                        .sort((a, b) => a.slotId - b.slotId)
                        .map((s, index) => (
                          <Slot
                            key={index}
                            slotData={s}
                            indicator={indicator}
                          />
                        ))}
                    </ul>
                  )}
                </>
              )}
            </>
          </div>
        </div>
      </div>
      <ToastContainer
        limit={1}
        autoClose={1000}
        position="top-center"
        hideProgressBar
      />

      <Modal
        isOpen={unlocking.unlocking}
        onClose={() => setCloseLockWait(true)}
      >
        <LockWait
          slotNo={unlocking.slotId}
          hn={unlocking.hn}
          onClose={() => setCloseLockWait(true)}
          onOpenDeactive={() => setOpenDeactivate(true)}
        />
      </Modal>
      <Modal
        isOpen={dispensing.dispensing}
        onClose={() => setCloseLockWait(true)}
      >
        <DispensingWait
          slotNo={dispensing.slotId}
          hn={dispensing.hn}
          onClose={() => setCloseLockWait(true)}
          onOpenDeactive={() => setOpenDeactivate(true)}
        />
      </Modal>

      <Modal isOpen={openDeactivate} onClose={() => setOpenDeactivate(false)}>
        <DeActivate
          slotNo={unlocking.slotId ?? dispensing.slotId}
          onClose={() => {
            setOpenDeactivate(false);
            setCloseLockWait(true);
          }}
        />
      </Modal>
    </>
  );
}

export default Home;

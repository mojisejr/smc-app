import React, { useEffect, useState } from "react";
import Head from "next/head";
import Slot from "../components/Slot";
import Image from "next/image";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Modal from "../components/Modals";
import LockWait from "../components/Dialogs/lockWait";
import DispensingWait from "../components/Dialogs/dispensingWait";

import { useKuStatesContext } from "../contexts/kuStatesContext";
import Loading from "../components/Shared/Loading";
import { useDispense } from "../hooks/useDispense";
import { useUnlock } from "../hooks/useUnlock";
import Navbar from "../components/Shared/Navbar";
import DeActivate from "../components/Dialogs/Deactivate";
import { useIndicator } from "../hooks/useIndicator";
import { useApp } from "../contexts/appContext";
import { generateSlotArray, getResponsiveGridConfig, debugSlotConfiguration, loadDisplaySlotConfigAsync } from "../utils/getDisplaySlotConfig";

function Home() {
  const { slots, refreshSlots } = useKuStatesContext();
  const { unlocking } = useUnlock();
  const { dispensing } = useDispense();
  const { indicator } = useIndicator();
  const { isActivated } = useApp();
  const [closeClearOrCon, setCloseClearOrCon] = useState<boolean>(false);
  const [closeLockWait, setCloseLockWait] = useState<boolean>(false);
  const [openDeactivate, setOpenDeactivate] = useState<boolean>(false);
  const [configLoading, setConfigLoading] = useState<boolean>(true);
  const [mockSlots, setMockSlots] = useState<any[]>([]);
  const [gridConfig, setGridConfig] = useState<{
    containerClass: string;
    gridClass: string;
    gapClass: string;
  }>({
    containerClass: 'h-full place-content-center place-items-center px-8 py-8',
    gridClass: 'grid grid-cols-4',
    gapClass: 'gap-6'
  });

  // Load device configuration on component mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setConfigLoading(true);
        await loadDisplaySlotConfigAsync();
        
        // Get grid configuration after database config is loaded
        const responsiveGridConfig = getResponsiveGridConfig();
        setGridConfig(responsiveGridConfig);
        
        const slots = generateSlotArray();
        setMockSlots(slots);
        debugSlotConfiguration();
      } catch (error) {
        console.error('Error loading device configuration:', error);
        // Use default slots if config loading fails
        const defaultSlots = generateSlotArray();
        setMockSlots(defaultSlots);
      } finally {
        setConfigLoading(false);
      }
    };

    loadConfig();
  }, []);

  // Refresh slot data when activation status changes
  useEffect(() => {
    if (isActivated) {
      // Info log removed for production
      refreshSlots();
    }
  }, [isActivated, refreshSlots]);

  useEffect(() => {
    if (unlocking.unlocking) {
      setCloseLockWait(false);
    }
  }, [unlocking]);

  useEffect(() => {
    if (dispensing.continue) {
      // Info log removed for production
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
          <div className="w-full h-full p-4 lg:p-6 xl:p-8 overflow-y-auto">
            <>
              {configLoading ? (
                <div className="min-h-[300px] flex justify-center items-center">
                  <Loading />
                </div>
              ) : mockSlots === undefined ? (
                <div>Error: undefined</div>
              ) : (
                <>
                  {mockSlots.length <= 0 ? (
                    <div className="min-h-[300px] flex justify-center items-center">
                      <Loading />
                    </div>
                  ) : (
                    <ul className={`${gridConfig.gridClass} ${gridConfig.gapClass} ${gridConfig.containerClass}`}>
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

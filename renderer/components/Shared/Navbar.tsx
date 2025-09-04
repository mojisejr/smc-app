import {
  BsBook,
  BsFillTerminalFill,
  BsHouseDoor,
  BsQuestionCircle,
  BsUnlockFill,
} from "react-icons/bs";
import Link from "next/link";
import { useKuStates } from "../../hooks/useKuStates";
import { useEffect, useState } from "react";
import { useDispense } from "../../hooks/useDispense";
import Modal from "../Modals";
import DispenseSlot from "../Dialogs/dispenseSlot";
import ClearOrContinue from "../Dialogs/clearOrContinue";
import { FaLock } from "react-icons/fa";
import AuthDialog from "../Dialogs/auth";
import { useApp } from "../../contexts/appContext";
import Indicators from "../Indicators/indicators";

interface NavbarProps {
  active: number;
}
const Navbar = ({ active }: NavbarProps) => {
  const { admin, setAdmin } = useApp();
  const { slots, canDispense } = useKuStates();
  const { dispensing } = useDispense();
  const [openDispenseModal, setOpenDispenseModal] = useState<boolean>(false);
  const [closeClearOrCon, setCloseClearOrCon] = useState<boolean>(false);
  const [openAuthModal, setOpenAuthModal] = useState<boolean>(false);

  useEffect(() => {
    if (admin !== null && active !== 5) {
      setAdmin(null);
    }
  }, [active]);

  useEffect(() => {
    if (dispensing.reset && !dispensing.dispensing) {
      setCloseClearOrCon(false);
    }
  }, [dispensing]);

  const handleDispenseButton = () => {
    setOpenDispenseModal(true);
  };
  const handleCloseClearOrCon = () => {
    setCloseClearOrCon(true);
  };

  const handleAuth = () => {
    if (!admin) {
      setOpenAuthModal(true);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-2">
      <button
        disabled={!canDispense || active != 1}
        onClick={() => handleDispenseButton()}
        className="btn flex justify-start items-center gap-2 font-bold bg-[#eee] rounded-xl shadow-xl hover:bg-[#5495F6] hover:text-[#fff] disabled:text-[#ddd] disabled:bg-[#eee]"
      >
        <BsUnlockFill />
        จ่ายยา
      </button>
      <Link href="/home">
        <button
          className={`btn btn-ghost flex justify-start items-center gap-2  ${
            active == 1 ? "btn-active text-white" : null
          }`}
        >
          <BsHouseDoor size={16} />
          <span>หน้าหลัก</span>
        </button>
      </Link>
      {/* <Link href="/document">
        <button
          className={`btn btn-ghost flex justify-start items-center gap-2  ${
            active == 2 ? "btn-active text-white" : null
          }`}
        >
          <BsBook size={16} />
          <span>คู่มือการใช้งาน</span>
        </button>
      </Link> */}
      {/* <Link href="/about">
        <button
          className={`btn btn-ghost flex justify-start items-center gap-2  ${
            active == 3 ? "btn-active text-white" : null
          }`}
        >
          <BsQuestionCircle size={16} />
          <span>ข้อมูลระบบ</span>
        </button>
      </Link> */}
      <Link href="/logs">
        <button
          className={`btn btn-ghost flex justify-start items-center gap-2  ${
            active == 4 ? "btn-active text-white" : null
          }`}
        >
          <BsFillTerminalFill size={16} />
          <span>logs</span>
        </button>
      </Link>
      <button
        onClick={handleAuth}
        className={`btn btn-ghost flex justify-start items-center gap-2
           ${active == 5 ? "btn-active text-white" : null}`}
      >
        <FaLock size={16} />
        <span>Admin</span>
      </button>
      <Modal
        isOpen={openDispenseModal}
        onClose={() => setOpenDispenseModal(false)}
      >
        <DispenseSlot onClose={() => setOpenDispenseModal(false)} />
      </Modal>
      <Modal
        isOpen={
          closeClearOrCon ? false : !dispensing.dispensing && dispensing.reset
        }
        onClose={() => {}}
      >
        <ClearOrContinue
          slotNo={dispensing.slotId}
          hn={dispensing.hn}
          onClose={handleCloseClearOrCon}
        />
      </Modal>
      <Modal isOpen={openAuthModal} onClose={() => setOpenAuthModal(false)}>
        <AuthDialog onClose={() => setOpenAuthModal(false)} />
      </Modal>
      {/* <Indicators /> */}
    </div>
  );
};

export default Navbar;

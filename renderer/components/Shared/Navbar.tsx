import {
  BsBook,
  BsFillTerminalFill,
  BsHouseDoor,
  BsQuestionCircle,
  BsUnlockFill,
} from "react-icons/bs";
import { useApp } from "../../contexts/appContext";
import Link from "next/link";
import { useKuStates } from "../../hooks/useKuStates";
import { useEffect, useState } from "react";
import { useDispense } from "../../hooks/useDispense";
import Modal from "../Modals";
import DispenseSlot from "../Dialogs/dispenseSlot";
import ClearOrContinue from "../Dialogs/clearOrContinue";

interface NavbarProps {
  active: number;
}
const Navbar = ({ active }: NavbarProps) => {
  const { slots, canDispense } = useKuStates();
  const { dispensing } = useDispense();
  const [openDispenseModal, setOpenDispenseModal] = useState<boolean>(false);
  const [closeClearOrCon, setCloseClearOrCon] = useState<boolean>(false);
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
  
  const { user, logged, logOut } = useApp();

  const handleLogout = () => {
    // ipcRenderer.invoke("logout-re");
    logOut(); 
  }



  return (
    <div className="grid grid-cols-1 gap-2">
      {user != undefined ? (
        <div className="font-semibold text-sm">User: {user.name}</div>
      ) : null}
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
            active == 1 ? "btn-active" : null
          }`}
        >
          <BsHouseDoor size={16} />
          <span className={`${active == 1 ? "font-bold" : null}`}>หน้าหลัก</span>
        </button>
      </Link>
      <Link href="/document">
        <button
          className={`btn btn-ghost flex justify-start items-center gap-2  ${
            active == 2 ? "btn-active" : null
          }`}
        >
          <BsBook size={16} />
          <span className={`${active == 2 ? "font-bold" : null}`}>
            คู่มือการใช้งาน
          </span>
        </button>
      </Link>
      <Link href="/about">
        <button
          className={`btn btn-ghost flex justify-start items-center gap-2  ${
            active == 3 ? "btn-active" : null
          }`}
        >
          <BsQuestionCircle size={16} />
          <span className={`${active == 3 ? "font-bold" : null}`}>ข้อมูลระบบ</span>
        </button>
      </Link>
      { user && user.role == "ADMIN" ?
      <Link href="/logs">
        <button
          className={`btn btn-ghost flex justify-start items-center gap-2  ${
            active == 4 ? "btn-active font-bold" : null
          }`}
        >
          <BsFillTerminalFill size={16} />
          <span className={`${active == 4 ? "font-bold" : null}`}>Logs</span>
        </button>
      </Link> : null }
      { user && user.role == "ADMIN" ? <Link href="/setting">
        <button
          className={`btn btn-ghost flex justify-start items-center gap-2  ${
            active == 5 ? "btn-active font-bold" : null
          }`}
        >
          <BsFillTerminalFill size={16} />
          <span className={`${active == 5 ? "font-bold" : null}`}>ตั้งค่า</span>
        </button>
      </Link> : null }
      {logged ? (
        <div className="mt-4">
          <button
            className={`btn btn-error btn-outline flex justify-start items-center gap-3 w-full`}
            onClick={() => handleLogout()}
          >
            <span className={"font-bold hover:text-white"}>ออกจากระบบ</span>
          </button>
        </div>
      ) : null}
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
    </div>
  );
};

export default Navbar;

import { BsBook, BsFillTerminalFill, BsHouseDoor, BsQuestionCircle } from "react-icons/bs";
import { useApp } from "../../contexts/appContext";
import Link from 'next/link'

interface NavbarProps  {
    active: number;
}
const Navbar = ({active}: NavbarProps) => {
    const { user, logged, logOut } = useApp();
    return <div className="grid grid-cols-1 gap-2">
              {user != undefined ? (
                <div className="font-bold">User: {user.stuffId}</div>
              ) : null}
              <Link href="/home">
                <button className={`btn btn-ghost flex justify-start items-center gap-2  ${active == 1 ? "btn-active" : null}`} >
                  <BsHouseDoor size={16} />
                  <span className={`${active == 1 ? "font-bold" : null}`}>Home</span>
                </button>
              </Link>
              <Link href="/document">
                <button className={`btn btn-ghost flex justify-start items-center gap-2  ${active == 2? "btn-active" : null}`} >
                <BsBook size={16} />
                <span className={`${active == 2 ? "font-bold" : null}`}>Documents</span>
              </button>
              </Link>
              <Link href="/about">
                <button className={`btn btn-ghost flex justify-start items-center gap-2  ${active == 3 ? "btn-active" : null}`} >
                <BsQuestionCircle size={16} />
                <span className={`${active == 3 ? "font-bold" : null}`}>About</span>
              </button>
              </Link>
            <Link href="/logs">
                <button className={`btn btn-ghost flex justify-start items-center gap-2  ${active == 4 ? "btn-active font-bold" : null}`} >
                <BsFillTerminalFill size={16} />
                <span className={`${active == 4 ? "font-bold" : null}`}>Logs</span>
              </button>
            </Link>
            { logged ? <div className="mt-4">
            <button className={`btn btn-error btn-outline flex justify-start items-center gap-3 w-full`} onClick={() => logOut()} >
                <span className={"font-bold hover:text-white"}>Logout</span>
              </button>
            </div> : null }

            </div>
}

export default Navbar;

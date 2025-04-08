import React from "react";
import Tooltip from "../Shared/Tooltip";

interface UserSettingProps {
  userList: any[];
  handleNewUser: () => void;
  handleDeleteUser: (id: string) => void;
  setting: any;
}

export default function UserSetting({
  userList,
  handleNewUser,
  handleDeleteUser,
  setting,
}: UserSettingProps) {
  return (
    <div className="bg-white rounded-lg p-6 h-[60vh] overflow-y-auto text-[#000]">
      <h2 className="text-xl text-start font-semibold mb-4 ">
        จัดการผู้ใช้งาน
      </h2>
      <div className="flex justify-end gap-1">
        <button onClick={handleNewUser} className="btn btn-sm btn-primary">
          เพิ่ม User
        </button>
      </div>
      <div>
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold mb-4 text-start">
            รายชื่อผู้ใช้งาน
          </h3>
          <div className="text-sm font-semibold flex gap-2 items-center">
            <Tooltip text="จำนวนผู้ใช้งานสูงสุด" />
            <div>
              {userList.length}/{setting?.max_user} คน
            </div>
          </div>
        </div>
        <div className="h-full overflow-y-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-[#000]">
                <th className="font-bold">ชื่อ</th>
                <th className="font-bold">สิทธิ์</th>
                <th className="font-bold">actions</th>
              </tr>
            </thead>
            <tbody>
              {userList.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.role}</td>
                  <td>
                    {user.role === "ADMIN" ? null : (
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="btn btn-error btn-sm"
                      >
                        ลบ
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

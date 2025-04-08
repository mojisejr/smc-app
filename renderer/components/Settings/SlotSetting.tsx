import React from "react";

interface SlotSettingProps {
  slotList: any[];
  handleDeactivateAll: () => void;
  handleReactivateAll: () => void;
  handleDeactivateAdmin: (slotId: number) => void;
  handleReactivateAdmin: (slotId: number) => void;
}

export default function SlotSetting({
  slotList,
  handleDeactivateAll,
  handleReactivateAll,
  handleDeactivateAdmin,
  handleReactivateAdmin,
}: SlotSettingProps) {
  return (
    <div className="bg-white rounded-lg p-6 min-h-[60vh] text-[#000]">
      <h2 className="text-xl text-start font-semibold mb-4">จัดการช่องยา</h2>
      <div className="flex justify-end gap-1">
        <button
          onClick={handleDeactivateAll}
          className="btn btn-sm btn-primary"
        >
          ปิดช่องยาทั้งหมด
        </button>
        <button
          onClick={handleReactivateAll}
          className="btn btn-sm btn-primary"
        >
          เปิดช่องยาทั้งหมด
        </button>
      </div>
      <div className="h-[60vh] overflow-y-scroll">
        <h3 className="text-sm font-semibold mb-4 text-start">รายชื่อช่องยา</h3>
        <table className="table table-sm">
          <thead>
            <tr className="text-[#000]">
              <th className="font-bold">ช่องยา</th>
              <th className="font-bold">สถานะ</th>
              <th className="font-bold">actions</th>
            </tr>
          </thead>
          <tbody>
            {slotList.map((slot) => (
              <tr key={slot.slotId}>
                <td>{slot.slotId}</td>
                <td className="text-primary font-bold">{slot.statusText}</td>
                <td>
                  {slot.status === true ? (
                    <button
                      onClick={() => handleDeactivateAdmin(slot.slotId)}
                      className="btn btn-sm btn-error"
                    >
                      ปิดการใช้งาน
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivateAdmin(slot.slotId)}
                      className="btn btn-sm btn-primary"
                    >
                      เปิดการใช้งาน
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

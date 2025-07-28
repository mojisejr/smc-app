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
          className="btn btn-sm btn-error"
        >
          ปิดช่องยาทั้งหมด (12 ช่อง)
        </button>
        <button
          onClick={handleReactivateAll}
          className="btn btn-sm btn-success"
        >
          เปิดช่องยาทั้งหมด (12 ช่อง)
        </button>
      </div>
      <div className="h-[60vh] overflow-y-scroll">
        <h3 className="text-sm font-semibold mb-4 text-start">รายชื่อช่องยา (12 ช่อง)</h3>
        
        {/* Grid layout for 12 slots */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {slotList
            .filter(slot => slot.slotId <= 12)
            .map((slot) => (
            <div key={slot.slotId} className="card bg-base-200 shadow-sm">
              <div className="card-body p-4">
                <h3 className="card-title text-lg">Slot {slot.slotId}</h3>
                <div className="space-y-2">
                  <div className={`badge ${slot.status ? 'badge-success' : 'badge-error'}`}>
                    {slot.statusText}
                  </div>
                  <div className="flex gap-2">
                    {slot.status === true ? (
                      <button
                        onClick={() => handleDeactivateAdmin(slot.slotId)}
                        className="btn btn-sm btn-error"
                      >
                        ปิด
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivateAdmin(slot.slotId)}
                        className="btn btn-sm btn-success"
                      >
                        เปิด
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Alternative table view for reference */}
        <div className="collapse collapse-arrow bg-base-200">
          <input type="checkbox" />
          <div className="collapse-title text-sm font-medium">
            แสดงรายการแบบตาราง
          </div>
          <div className="collapse-content">
            <table className="table table-sm">
              <thead>
                <tr className="text-[#000]">
                  <th className="font-bold">ช่องยา</th>
                  <th className="font-bold">สถานะ</th>
                  <th className="font-bold">actions</th>
                </tr>
              </thead>
              <tbody>
                {slotList
                  .filter(slot => slot.slotId <= 12)
                  .map((slot) => (
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
                          className="btn btn-sm btn-success"
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
      </div>
    </div>
  );
}

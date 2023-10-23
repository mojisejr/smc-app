import { DB, IO } from "../enums/ipc.enums";
import { ipcMain } from "electron";

export function logEvents() {
  console.log(`${DB.SlotRegistered}`, ipcMain.listenerCount(DB.SlotRegistered));
  console.log(`${DB.GetAllSlots}`, ipcMain.listenerCount(DB.GetAllSlots));
  console.log(`${IO.Opening}`, ipcMain.listenerCount(IO.Opening));
  console.log(`${IO.Closed}`, ipcMain.listenerCount(IO.Closed));
  console.log(`${IO.Unlock}`, ipcMain.listenerCount(IO.Unlock));
  console.log(`${IO.Unlocked}`, ipcMain.listenerCount(IO.Unlocked));
  console.log(
    `${IO.WaitForLockBack}`,
    ipcMain.listenerCount(IO.WaitForLockBack)
  );
  console.log(`${IO.Dispense}`, ipcMain.listenerCount(IO.Dispense));
  console.log(`${IO.Dispensing}`, ipcMain.listenerCount(IO.Dispensing));
  console.log(
    `${IO.WaitForDispensingLockBack}`,
    ipcMain.listenerCount(IO.WaitForDispensingLockBack)
  );
  console.log(
    `${IO.DispensingClosed}`,
    ipcMain.listenerCount(IO.DispensingClosed)
  );
  console.log(
    `${IO.DispensingClear}`,
    ipcMain.listenerCount(IO.DispensingClear)
  );
  console.log(
    `${IO.DispensingFinished}`,
    ipcMain.listenerCount(IO.DispensingFinished)
  );
}

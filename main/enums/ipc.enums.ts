export enum DB {
  SlotRegistered = 'slot-registered',
  GetAllSlots = 'get-all-slots'
}

export enum IO {
  Opening = 'opening',
  Closed = 'closed',
  Unlock = 'unlock',
  Unlocked = 'unlocked',
  WaitForLockBack = 'wait-for-lock-back',
  Dispense = 'dispense',
  Dispensing = 'dispensing',
  WaitForDispensingLockBack = 'wait-for-dispensing-lock-back',
  DispensingClosed = 'dispensing-closed',
  DispensingClear = 'dispensing-clear',
  DispensingFinished = 'dispensing-finished'
}
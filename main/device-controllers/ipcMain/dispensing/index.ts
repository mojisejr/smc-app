import { unlockHandler } from "./unlock";
import { dispenseHandler } from "./dispense";
import { dispenseContinueHandler } from "./dispensing-continue";

export function registerDispensingHandlers(): void {
  unlockHandler();
  dispenseHandler();
  dispenseContinueHandler();
}
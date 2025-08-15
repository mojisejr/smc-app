import { initHandler } from "./init";
import { getPortListHandler } from "./getPortList";
import { checkLockedBackHandler } from "./checkLockedBack";

export function registerCoreHandlers(): void {
  initHandler();
  getPortListHandler();
  checkLockedBackHandler();
}
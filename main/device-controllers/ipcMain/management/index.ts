import { dispensingResetHandler } from "./reset";
import { forceResetHandler } from "./forceReset";

export function registerManagementHandlers(): void {
  dispensingResetHandler();
  forceResetHandler();
}
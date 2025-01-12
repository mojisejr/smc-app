export interface SlotState {
  slotId: number;
  hn?: string | undefined;
  timestamp?: number;
  lastOp?: string | undefined;
  occupied: boolean;
  opening: boolean;
  isActive: boolean
}

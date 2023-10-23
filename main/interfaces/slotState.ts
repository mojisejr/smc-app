export interface SlotState {
  id: number;
  hn?: string | undefined;
  timestamp?: Date;
  userId?: string | undefined;
  locked: boolean;
  registered: boolean;
  opening: boolean;
}

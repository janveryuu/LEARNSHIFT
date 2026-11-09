import { create } from 'zustand';

/** Live, non-persisted session state: the demo session and transient UI. */
type Session = {
  /** Minutes into the current ShortVids session (the live demo session). */
  simMinutes: number;
  shiftOpen: boolean;
  /** Epoch ms when an active focus session ends; null when not focusing. */
  focusUntil: number | null;
  /** Bumped to replay a scenario even if it is already on screen. */
  scenarioRun: number;
  /** The time request sent from the lock screen in this session. */
  lockRequestId: string | null;
  setSimMinutes: (n: number) => void;
  setShiftOpen: (v: boolean) => void;
  setFocusUntil: (t: number | null) => void;
  bumpScenario: () => void;
  setLockRequestId: (id: string | null) => void;
};

export const useSession = create<Session>()((set) => ({
  simMinutes: 0,
  shiftOpen: false,
  focusUntil: null,
  scenarioRun: 0,
  lockRequestId: null,
  setSimMinutes: (simMinutes) => set({ simMinutes }),
  setShiftOpen: (shiftOpen) => set({ shiftOpen }),
  setFocusUntil: (focusUntil) => set({ focusUntil }),
  bumpScenario: () => set((s) => ({ scenarioRun: s.scenarioRun + 1 })),
  setLockRequestId: (lockRequestId) => set({ lockRequestId }),
}));

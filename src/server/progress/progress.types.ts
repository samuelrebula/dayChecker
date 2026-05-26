export type ProgressRecord = {
  anonymousId: string;
  targetCount: number;
  currentCount: number;
  lastCheckedDateKey: string | null;
  completedAt: Date | null;
};

export type ProgressPayload = {
  targetCount: number;
  currentCount: number;
  lastCheckedDateKey: string | null;
  completedAt: string | null;
  todayKey: string;
  canCheckToday: boolean;
};

export type ProgressResponseBody = {
  progress?: ProgressPayload;
  message?: string;
  error?: string;
};

export type ProgressAction = "check" | "update-target";

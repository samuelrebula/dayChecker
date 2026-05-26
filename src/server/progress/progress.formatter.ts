import type { ProgressPayload, ProgressRecord } from "./progress.types";

export function buildProgressPayload(
  progress: ProgressRecord,
  todayKey: string,
): ProgressPayload {
  return {
    targetCount: progress.targetCount,
    currentCount: progress.currentCount,
    lastCheckedDateKey: progress.lastCheckedDateKey,
    completedAt: progress.completedAt?.toISOString() ?? null,
    todayKey,
    canCheckToday:
      progress.lastCheckedDateKey !== todayKey && progress.completedAt === null,
  };
}

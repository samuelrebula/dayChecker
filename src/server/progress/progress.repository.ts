import { prisma } from "@/lib/prisma";

import type { ProgressRecord } from "./progress.types";

const defaultTargetCount = 30;

export async function getOrCreateProgress(anonymousId: string) {
  const existing = await prisma.progress.findUnique({
    where: { anonymousId },
  });

  if (existing) {
    return existing as ProgressRecord;
  }

  const created = await prisma.progress.create({
    data: {
      anonymousId,
      targetCount: defaultTargetCount,
      currentCount: 0,
    },
  });

  return created as ProgressRecord;
}

export async function updateTarget(anonymousId: string, targetCount: number) {
  const progress = await getOrCreateProgress(anonymousId);

  return prisma.progress.update({
    where: { anonymousId },
    data: {
      targetCount,
      completedAt:
        targetCount <= progress.currentCount
          ? (progress.completedAt ?? new Date())
          : null,
    },
  });
}

export async function recordDailyCheck(anonymousId: string, todayKey: string) {
  const progress = await getOrCreateProgress(anonymousId);
  const nextCount = Math.min(progress.currentCount + 1, progress.targetCount);
  const completedAt = nextCount >= progress.targetCount ? new Date() : null;

  return prisma.progress.update({
    where: { anonymousId },
    data: {
      currentCount: nextCount,
      lastCheckedDateKey: todayKey,
      completedAt,
    },
  });
}

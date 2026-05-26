"use client";

import { DailyCheckerLayout } from "@/components/daily-checker-ui/daily-checker-layout";
import { useDailyChecker } from "@/components/daily-checker-ui/use-daily-checker";

export function DailyChecker() {
  const model = useDailyChecker();

  return <DailyCheckerLayout {...model} />;
}

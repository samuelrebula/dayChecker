"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

type ProgressState = {
  targetCount: number;
  currentCount: number;
  lastCheckedDateKey: string | null;
  completedAt: string | null;
  todayKey: string;
  canCheckToday: boolean;
};

type ApiResponse = {
  progress: ProgressState;
  message: string;
};

type DailyCheckerModel = {
  progress: ProgressState;
  targetInput: string;
  status: string;
  error: string | null;
  isPending: boolean;
  progressPercent: number;
  remaining: number;
  isComplete: boolean;
  onTargetInputChange: (value: string) => void;
  onCheckToday: () => void;
  onUpdateTarget: () => void;
};

const initialProgress: ProgressState = {
  targetCount: 30,
  currentCount: 0,
  lastCheckedDateKey: null,
  completedAt: null,
  todayKey: new Date().toISOString().slice(0, 10),
  canCheckToday: true,
};

export function useDailyChecker(): DailyCheckerModel {
  const [progress, setProgress] = useState<ProgressState>(initialProgress);
  const [targetInput, setTargetInput] = useState("30");
  const [status, setStatus] = useState("Loading your progress...");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function loadProgress() {
      try {
        const response = await fetch("/api/progress", { cache: "no-store" });
        const data = (await response.json()) as ApiResponse;

        if (!cancelled) {
          setProgress(data.progress);
          setTargetInput(String(data.progress.targetCount));
          setStatus(data.message);
        }
      } catch {
        if (!cancelled) {
          setStatus("Could not load your data right now.");
        }
      }
    }

    void loadProgress();

    return () => {
      cancelled = true;
    };
  }, []);

  const progressPercent = useMemo(() => {
    if (progress.targetCount <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.round((progress.currentCount / progress.targetCount) * 100),
    );
  }, [progress.currentCount, progress.targetCount]);

  const remaining = Math.max(progress.targetCount - progress.currentCount, 0);
  const isComplete =
    progress.completedAt !== null ||
    progress.currentCount >= progress.targetCount;

  function syncProgress(nextProgress: ProgressState, message: string) {
    setProgress(nextProgress);
    setTargetInput(String(nextProgress.targetCount));
    setStatus(message);
    setError(null);
  }

  function onCheckToday() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "check" }),
        });

        const data = (await response.json()) as ApiResponse & {
          error?: string;
        };

        if (!response.ok) {
          setError(data.error ?? "Could not save today’s check.");
          return;
        }

        syncProgress(data.progress, data.message);
      } catch {
        setError("Network error while saving the check.");
      }
    });
  }

  function onUpdateTarget() {
    const parsedTarget = Number(targetInput);

    if (
      !Number.isInteger(parsedTarget) ||
      parsedTarget < 1 ||
      parsedTarget > 365
    ) {
      setError("Set a target between 1 and 365.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-target",
            targetCount: parsedTarget,
          }),
        });

        const data = (await response.json()) as ApiResponse & {
          error?: string;
        };

        if (!response.ok) {
          setError(data.error ?? "Could not update the target.");
          return;
        }

        syncProgress(data.progress, data.message);
      } catch {
        setError("Network error while updating the target.");
      }
    });
  }

  return {
    progress,
    targetInput,
    status,
    error,
    isPending,
    progressPercent,
    remaining,
    isComplete,
    onTargetInputChange: setTargetInput,
    onCheckToday,
    onUpdateTarget,
  };
}

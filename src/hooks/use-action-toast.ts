"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

type ActionFeedback = {
  error?: string;
  success?: string;
} | null;

export function useActionToast(state: ActionFeedback) {
  const lastRef = useRef<ActionFeedback>(null);

  useEffect(() => {
    if (!state || state === lastRef.current) {
      return;
    }

    lastRef.current = state;

    if (state.error) {
      toast.error(state.error);
    } else if (state.success) {
      toast.success(state.success);
    }
  }, [state]);
}

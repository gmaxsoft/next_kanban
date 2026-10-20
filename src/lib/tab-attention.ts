const DEFAULT_INTERVAL_MS = 1200;

let originalTitle: string | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let stopHandlersBound = false;

function restoreTitle() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }

  if (originalTitle !== null && typeof document !== "undefined") {
    document.title = originalTitle;
    originalTitle = null;
  }
}

function bindStopHandlers() {
  if (stopHandlersBound || typeof window === "undefined") {
    return;
  }

  stopHandlersBound = true;

  const stop = () => {
    restoreTitle();
  };

  window.addEventListener("focus", stop);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      stop();
    }
  });
}

/**
 * Makes the browser tab "blink" by alternating the document title
 * until the user focuses the tab again.
 */
export function flashDocumentTitle(
  alertTitle: string,
  intervalMs = DEFAULT_INTERVAL_MS,
) {
  if (typeof document === "undefined") {
    return;
  }

  if (document.visibilityState === "visible" && document.hasFocus()) {
    return;
  }

  bindStopHandlers();

  if (originalTitle === null) {
    originalTitle = document.title;
  }

  if (intervalId !== null) {
    clearInterval(intervalId);
  }

  let showAlert = true;
  document.title = alertTitle;

  intervalId = setInterval(() => {
    if (originalTitle === null) {
      return;
    }

    document.title = showAlert ? originalTitle : alertTitle;
    showAlert = !showAlert;
  }, intervalMs);
}

export function stopDocumentTitleFlash() {
  restoreTitle();
}

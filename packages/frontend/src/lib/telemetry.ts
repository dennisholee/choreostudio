const BASE_URL = '/api/v1/telemetry';
const BATCH_FLUSH_MS = 2000;

interface TelemetryEvent {
  event: string;
  canvasId?: string;
  workspaceId?: string;
  properties?: Record<string, unknown>;
}

let queue: TelemetryEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0);
  timer = null;
  for (const evt of batch) {
    navigator.sendBeacon
      ? navigator.sendBeacon(BASE_URL, JSON.stringify(evt))
      : fetch(BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(evt),
          keepalive: true,
        }).catch(() => {});
  }
}

export function track(event: string, properties?: Record<string, unknown>, context?: { canvasId?: string; workspaceId?: string }): void {
  if (typeof window === 'undefined') return;
  queue.push({ event, properties, ...context });
  if (!timer) {
    timer = setTimeout(flush, BATCH_FLUSH_MS);
  }
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('beforeunload', flush);
}

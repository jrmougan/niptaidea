declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, string | number | boolean>) => void;
    };
  }
}

export function trackEvent(
  event: string,
  data?: Record<string, string | number | boolean>,
): void {
  window.umami?.track(event, data);
}

import type { NextWebVitalsMetric } from "next/app";

const vitalsEndpoint =
  process.env.NEXT_PUBLIC_VITALS_ENDPOINT || "/api/analytics/vitals";

export function reportWebVitals(metric: NextWebVitalsMetric) {
  try {
    if (process.env.NODE_ENV === "development") {
      console.log("[Web Vitals]", metric);
      return;
    }

    if (!vitalsEndpoint) {
      return;
    }

    const body = JSON.stringify({
      id: metric.id,
      name: metric.name,
      label: metric.label,
      value: metric.value,
      startTime: metric.startTime,
    });

    navigator.sendBeacon?.(vitalsEndpoint, body);
  } catch (error) {
    console.error("Failed to report web vitals", error);
  }
}


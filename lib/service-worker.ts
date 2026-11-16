let registrationPromise: Promise<ServiceWorkerRegistration> | undefined;

/** Share registration and wait for activation before using PushManager. */
export async function registerAppServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (typeof navigator === "undefined" ||
      typeof navigator.serviceWorker?.register !== "function") {
    throw new Error("Service workers are not supported by this browser");
  }
  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    }).catch((error) => {
      registrationPromise = undefined;
      throw error;
    });
  }
  return registrationPromise;
}

export async function getActiveServiceWorker(): Promise<ServiceWorkerRegistration> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      registerAppServiceWorker().then(() => navigator.serviceWorker.ready),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Service worker activation timed out")), 15000);
      }),
    ]);
  } finally {
    clearTimeout(timer!);
  }
}

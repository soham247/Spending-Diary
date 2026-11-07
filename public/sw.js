self.addEventListener("push", (event) => {
  let data;
  try {
    data = event.data.json();
  } catch {
    data = {};
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Spending Diary", {
      body: data.body || "Your shared expenses have an update.",
      icon: "/favicon.ico",
      tag: data.tag,
      data: { url: data.url || "/activity" },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(
    event.notification.data?.url || "/activity",
    self.location.origin,
  );
  const destination =
    url.origin === self.location.origin
      ? url.href
      : self.location.origin + "/activity";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        const existing = windows.find(
          (window) => new URL(window.url).origin === self.location.origin,
        );
        if (existing)
          return existing
            .navigate(destination)
            .then((window) => window?.focus());
        return clients.openWindow(destination);
      }),
  );
});

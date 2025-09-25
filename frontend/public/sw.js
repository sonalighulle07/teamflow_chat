self.addEventListener("push", (event) => {
  const data = event.data.json();

  self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon || "/icons/call.png",
    badge: "/icons/badge.png",
    data: data.url || "/", // optional: click-through URL
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.notification.data) {
    clients.openWindow(event.notification.data);
  }
});


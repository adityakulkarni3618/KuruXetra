// Service Worker for background push alert capability
self.addEventListener('push', function(event) {
  let data = { title: 'Kuruxetra Alert', body: 'New update available on dashboard.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Kuruxetra Alert', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

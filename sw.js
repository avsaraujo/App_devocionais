// sw.js — Service Worker do Devocional PWA
const CACHE_NAME = 'devocional-pwa-v1';
const ASSETS = ['./index.html', './manifest.json'];

// ── Instalação: pré-cache dos assets estáticos ──────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ── Ativação: limpa caches antigos ──────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: serve do cache quando offline ────────────────────────────────────
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// ── Notificação diária via mensagem do cliente ───────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    // Disparar notificação imediatamente (o agendamento é feito pelo cliente via setTimeout)
    self.registration.showNotification('📖 Devocional do dia', {
      body: event.data.body || 'Seu devocional de hoje está esperando por você.',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: 'devocional-diario',
      renotify: true,
      requireInteraction: false,
      data: { url: './' }
    });
  }
});

// ── Clique na notificação: abre o app ────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('index.html') || client.url.endsWith('/')) {
          return client.focus();
        }
      }
      return clients.openWindow('./');
    })
  );
});

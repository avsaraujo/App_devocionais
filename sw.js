// sw.js — Service Worker do Devocional PWA
//
// Estratégia de atualização: "network-first para o index.html, cache para o restante"
// — garante que o app sempre carregue a versão mais recente quando online,
//   sem nunca apagar os dados do usuário (séries, caderno, progresso ficam
//   em localStorage, que é completamente separado do Cache API e nunca é
//   tocado por este SW).
//
// Para forçar atualização: basta subir novo index.html no GitHub.
// O SW detecta a mudança na próxima abertura e atualiza automaticamente.

const CACHE_NAME = 'devocional-pwa-v2';
const ASSETS_PRECACHE = ['./manifest.json'];

// ── Instalação: pré-cache apenas do manifest (index.html é network-first) ───
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_PRECACHE))
  );
  // skipWaiting: ativa imediatamente sem esperar abas antigas fecharem
  self.skipWaiting();
});

// ── Ativação: remove caches de versões anteriores ───────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log('[SW] Removendo cache antigo:', k);
            return caches.delete(k);
          })
      )
    ).then(() => {
      // Assume controle de todas as abas abertas imediatamente
      return self.clients.claim();
    })
  );
});

// ── Fetch: network-first para index.html, cache-first para o resto ──────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isHTML = url.pathname.endsWith('/') || url.pathname.endsWith('.html');

  if (isHTML) {
    // Network-first: tenta buscar versão nova, cai no cache se offline
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clona e armazena versão nova no cache
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Offline: serve do cache
          return caches.match(event.request);
        })
    );
  } else {
    // Cache-first para assets estáticos (manifest, ícones)
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
  }
});

// ── Mensagem do cliente: notificação diária ──────────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
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

  // Ping de verificação de versão (enviado pelo app na inicialização)
  if (event.data && event.data.type === 'GET_VERSION') {
    event.source.postMessage({ type: 'VERSION', version: CACHE_NAME });
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

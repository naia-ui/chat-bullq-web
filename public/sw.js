// Service worker mínimo — existe só pra satisfazer o critério de
// instalabilidade do PWA (Chrome/Android exige um SW com fetch handler).
// Não cacheia nada de API/dados dinâmicos — é um chat em tempo real,
// servir resposta velha seria pior que não ter cache nenhum.
const CACHE_NAME = 'justine-os-shell-v1';
const SHELL_ASSETS = ['/icon-192.png', '/icon-512.png', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// Network-first pra tudo. Só cai pro cache do shell se a rede falhar
// (ex.: sem sinal) e for um dos assets estáticos conhecidos.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});

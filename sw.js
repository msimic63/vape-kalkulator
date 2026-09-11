const CACHE = "esmoker-v5";
const BASE = "/E-cigarete";

// Samo statika se kešira; index.html je namjerno izostavljen
const ASSETS = [
  BASE + "/manifest.json",
  BASE + "/icon-192.png",
  BASE + "/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // 1) Vanjski zahtjevi (Firebase, Google auth, gstatic...) i sve što nije GET
  //    idu izravno na mrežu — SW ih ne dira
  if (url.origin !== self.location.origin || e.request.method !== "GET") return;

  // 2) index.html / navigacija: uvijek prvo mreža (tabovi i prijava se odmah osvježe),
  //    cache samo kao fallback za offline
  if (e.request.mode === "navigate" || url.pathname === BASE + "/" || url.pathname.endsWith("/index.html")) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match(BASE + "/index.html")))
    );
    return;
  }

  // 3) Ostala statika: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

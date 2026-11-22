// Service worker: нужен, чтобы браузер разрешил установку как приложения.
// Страница всегда берётся из сети (обновления приходят сразу),
// а если сети нет, показывается последняя сохранённая копия.
const CACHE = "smartgram-shell-v4";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const u = new URL(req.url);
  // Библиотека supabase-js с CDN: после первой загрузки хранится у телефона, чтобы приложение запускалось, даже если CDN недоступен (без VPN)
  if (req.method === "GET" && u.pathname.includes("supabase-js")) {
    e.respondWith(
      caches.open(CACHE).then((c) => c.match(req).then((hit) => {
        const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }))
    );
    return;
  }
  // Только свои файлы (страница, иконки). Запросы к Supabase не трогаем.
  if (req.method !== "GET" || u.origin !== self.location.origin) return;
  e.respondWith(
    fetch(req, { cache: "no-cache" })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("./")))
  );
});

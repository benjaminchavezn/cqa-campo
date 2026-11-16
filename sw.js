// Service worker: deja la app disponible sin señal (solo el "cascarón"; los datos van a SharePoint).
const CACHE = "cqa-campo-v2";
const SHELL = ["./", "index.html", "styles.css", "config.js", "manifest.webmanifest", "vendor/msal-browser.min.js",
  "js/app.js", "js/util.js", "js/idb.js", "js/auth.js", "js/backend-graph.js", "js/backend-demo.js", "js/catalogos.js", "js/ui.js", "js/estado.js", "js/cuenta.js", "icons/icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;  // Graph, login y descargas: siempre red
  // Red primero (para recibir mejoras), caché como respaldo sin señal.
  e.respondWith(fetch(e.request).then(r => {
    const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); return r;
  }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});

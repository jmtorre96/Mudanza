/* Service worker: deja que la app abra sin internet.
   Sube el número de VERSION cuando cambies archivos. */
const VERSION = "mudanza-v8";
const SHELL = [
  "./", "./index.html", "./styles.css", "./app.js", "./config.js",
  "./manifest.webmanifest", "./icon.svg",
  "./icon-192.png", "./icon-512.png", "./icon-180.png", "./icon-maskable-512.png",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Nunca guardar en caché las llamadas a la base de datos ni al login.
  if (url.hostname.endsWith(".supabase.co")) return;

  // Fuentes de Google: sirve lo guardado y actualiza en segundo plano.
  const esEstatico = SHELL.some((u) => req.url.endsWith(u.replace("./", "")))
    || url.hostname.indexOf("fonts.") === 0
    || url.hostname.indexOf("fonts.g") >= 0
    || url.hostname === "cdn.jsdelivr.net";

  if (!esEstatico && url.origin !== location.origin) return;

  e.respondWith(
    caches.match(req).then((hit) => {
      const red = fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copia = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copia));
        }
        return res;
      }).catch(() => hit);
      return hit || red;
    })
  );
});

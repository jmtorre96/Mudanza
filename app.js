/* ============================================================
   Bitácora de mudanza — lógica de la app
   ============================================================ */
(function () {
  "use strict";

  /* ---------------- constantes ---------------- */

  var ESTADOS = [
    { k: "por_empacar", n: "Por empacar",   c: "grey"   },
    { k: "empacado",    n: "Empacado",      c: "amber"  },
    { k: "en_camino",   n: "En camino",     c: "blue"   },
    { k: "entregado",   n: "En casa nueva", c: "accent" },
    { k: "desempacado", n: "Desempacado",   c: "green"  }
  ];
  var TIPOS = [
    { k: "caja",    n: "Caja",             corto: "Caja",    icono: "▣" },
    { k: "mueble",  n: "Mueble",           corto: "Mueble",  icono: "▭" },
    { k: "electro", n: "Electrodoméstico", corto: "Aparato", icono: "⚡" },
    { k: "suelto",  n: "Suelto / bolsa",   corto: "Suelto",  icono: "◇" }
  ];

  // No todo va en caja: un colchón o un congelador se registran igual, pero
  // la pantalla tiene que hablarles distinto.
  var TEXTOS = {
    caja: {
      code: "Escribe en la caja", campo: "¿Qué va adentro?",
      ph: "los platos de la vajilla de la abuela",
      hint: "Una nota breve basta. Ctrl + Enter guarda.",
      primero: "Abrir primero", falta: "Escribe qué va adentro o toma una foto.",
      guardado: "guardada"
    },
    mueble: {
      code: "Pégale esta etiqueta", campo: "¿Qué mueble es?",
      ph: "colchón matrimonial",
      hint: "Si se desarma, anótalo en Notas al editarlo.",
      primero: "Va primero", falta: "Escribe qué mueble es o toma una foto.",
      guardado: "guardado"
    },
    electro: {
      code: "Pégale esta etiqueta", campo: "¿Qué aparato es?",
      ph: "congelador",
      hint: "Ojo con mangueras y cables: anótalos en Notas.",
      primero: "Va primero", falta: "Escribe qué aparato es o toma una foto.",
      guardado: "guardado"
    },
    suelto: {
      code: "Pégale esta etiqueta", campo: "¿Qué es?",
      ph: "escoba, trapeador y cubeta",
      hint: "Para lo que no entra en caja ni es mueble.",
      primero: "Va primero", falta: "Escribe qué es o toma una foto.",
      guardado: "guardado"
    }
  };
  function textos() { return TEXTOS[S.ctx.tipo] || TEXTOS.caja; }

  // Quién mueve cada bulto
  var TRASLADOS = [
    { k: "mudanzera", n: "Mudanzera",   corto: "Mudanzera" },
    { k: "yo",        n: "Yo lo llevo", corto: "Yo" }
  ];
  function trasladoDef(k) {
    for (var i = 0; i < TRASLADOS.length; i++) if (TRASLADOS[i].k === k) return TRASLADOS[i];
    return TRASLADOS[0];
  }

  // Inventario de cosas
  var ESTADOS_COSA = [
    { k: "tengo", n: "Ya lo tengo",   c: "green" },
    { k: "falta", n: "Falta comprar", c: "red"   },
    { k: "quiza", n: "Por decidir",   c: "grey"  }
  ];
  function estadoCosa(k) {
    for (var i = 0; i < ESTADOS_COSA.length; i++) if (ESTADOS_COSA[i].k === k) return ESTADOS_COSA[i];
    return ESTADOS_COSA[0];
  }
  var MXN = null;
  function pesos(n) {
    if (n == null || isNaN(n)) return "";
    try {
      if (!MXN) MXN = new Intl.NumberFormat("es-MX", {
        style: "currency", currency: "MXN", maximumFractionDigits: 0
      });
      return MXN.format(n);
    } catch (e) { return "$" + Math.round(n); }
  }

  var CFG_DEF = {
    origenes: [
      { nombre: "Departamento",      clave: "DEP" },
      { nombre: "Casa de mis papás", clave: "BEL" }
    ],
    destinos: ["Sala", "Comedor", "Cocina", "Alacena", "Family PB",
      "Baño de visitas", "Cuarto de lavado", "Terraza", "Cochera", "Bodega",
      "Family PA", "Recámara principal", "Clóset principal", "Baño principal",
      "Recámara 2", "Recámara 3", "Estudio"],
    categorias: ["Cocina", "Alacena", "Lavandería y limpieza", "Baño",
      "Blancos y ropa de cama", "Ropa", "Sala y comedor", "Electrónica",
      "Audio y video", "Herramientas", "Jardín y exterior",
      "Documentos y papelería", "Decoración", "Libros", "Deporte",
      "Mascotas", "Niños", "Otros"]
  };
  var K = {
    bultos: "mudanza.cache.bultos",
    cosas:  "mudanza.cache.cosas",
    config: "mudanza.cache.config",
    queue:  "mudanza.queue",
    ctx:    "mudanza.ctx",
    ctxCosas: "mudanza.ctx.cosas",
    pend:   "mudanza.pendientes",
    diario: "mudanza.diario"
  };

  function estadoDef(k) {
    for (var i = 0; i < ESTADOS.length; i++) if (ESTADOS[i].k === k) return ESTADOS[i];
    return ESTADOS[1];
  }
  function tipoNombre(k) {
    for (var i = 0; i < TIPOS.length; i++) if (TIPOS[i].k === k) return TIPOS[i].n;
    return "Bulto";
  }

  /* ---------------- estado ---------------- */

  var sb = null, yo = "", miCorreo = "", sinAcceso = false;

  // Le pregunta a la base si este correo está en "permitidos".
  // Sin esto, un correo no autorizado puede capturar horas al vacío:
  // el servidor rechaza cada renglón y la app no se entera hasta que
  // se recarga y todo desaparece.
  async function verificaAcceso() {
    try {
      var r = await sb.rpc("es_de_la_casa");
      if (r.error) return;                 // versión vieja de la base: no bloqueamos
      sinAcceso = (r.data === false);
    } catch (e) { /* sin señal: no bloqueamos */ }
    $("alertaCorreo").textContent = miCorreo || "tu correo";
    $("alertaAcceso").hidden = !sinAcceso;
    if (sinAcceso) {
      $("btnSaveNext").disabled = true;
      $("cosaForm").querySelector('button[type="submit"]').disabled = true;
    }
  }

  function bloqueado() {
    if (!sinAcceso) return false;
    toast("Tu cuenta no tiene acceso: no se guarda nada. Revisa la tabla permitidos.");
    return true;
  }
  var S = {
    bultos: [],
    cosas: [],
    config: CFG_DEF,
    tab: "capturar",
    sesion: [],                 // códigos guardados en esta sesión
    filtros: { q: "", estados: {}, origenes: {}, destino: "", frag: false, first: false, traslado: "" },
    filtrosCosas: { q: "", estados: {}, categoria: "", ubicacion: "" },
    ctxCosas: { origen: "", cuarto: "", destino: "", categoria: "" },
    seleccion: {},
    ctx: {
      clave: "", cuarto_origen: "", destino: "", lugar: "",
      tipo: "caja", estado: "empacado", traslado: "mudanzera"
    }
  };

  /* ---------------- utilidades ---------------- */

  function $(id) { return document.getElementById(id); }
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function colVar(c) { return "var(--" + c + ")"; }
  function softVar(c) { return c === "accent" ? "var(--accent-soft)" : "var(--" + c + "-soft)"; }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16);
    });
  }
  function ls(k, v) {
    try {
      if (v === undefined) { var s = localStorage.getItem(k); return s ? JSON.parse(s) : null; }
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
  }

  var toastT = null;
  function toast(msg) {
    var t = $("toast"); if (!t) return;
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.hidden = true; }, 2600);
  }

  /* ==========================================================
     RED DE SEGURIDAD DE LOS DATOS

     Regla: un renglón que el servidor no ha confirmado NUNCA se
     borra del teléfono, pase lo que pase. Y de todo lo que se
     guarda queda una copia en un diario local que nadie sobrescribe.
     ========================================================== */

  function pendientes() { return ls(K.pend) || {}; }
  function marcaPendiente(id, tabla) {
    var p = pendientes(); p[id] = tabla; ls(K.pend, p);
  }
  function confirmaGuardado(id) {
    var p = pendientes();
    if (p[id]) { delete p[id]; ls(K.pend, p); }
  }
  function cuantasPendientes() { return Object.keys(pendientes()).length; }

  // Diario: copia de todo lo capturado, que recargar() jamás toca.
  // Es el último cable de seguridad si algo sale mal con la nube.
  function alDiario(tabla, row) {
    try {
      var d = ls(K.diario) || [];
      d.push({ t: tabla, en: new Date().toISOString(), row: row });
      if (d.length > 2500) d = d.slice(-2500);
      ls(K.diario, d);
    } catch (e) { /* si no cabe, seguimos */ }
  }

  // Vuelve a intentar todo lo que quedó sin confirmar
  async function reintentaPendientes() {
    if (!sb || !navigator.onLine || sinAcceso) return;
    var p = pendientes(), ids = Object.keys(p);
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i], tabla = p[id], row = null;
      if (tabla === "cosas") {
        for (var j = 0; j < S.cosas.length; j++) if (S.cosas[j].id === id) row = S.cosas[j];
      } else {
        for (var k = 0; k < S.bultos.length; k++) if (S.bultos[k].id === id) row = S.bultos[k];
      }
      if (!row) { confirmaGuardado(id); continue; }
      try {
        if (tabla === "cosas") await empujaCosa(row); else await empuja(row);
        confirmaGuardado(id);
      } catch (e) { if (esDeRed(e)) break; }
    }
    pintaRed();
  }

  /* ---------------- fotos ---------------- */

  // Cola de fotos pendientes (IndexedDB: los blobs no caben en localStorage).
  var IDB = (function () {
    var dbp = null;
    function abre() {
      if (dbp) return dbp;
      dbp = new Promise(function (res, rej) {
        if (!window.indexedDB) return rej(new Error("sin indexedDB"));
        var r = indexedDB.open("mudanza-fotos", 1);
        r.onupgradeneeded = function () { r.result.createObjectStore("cola", { keyPath: "id" }); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error); };
      });
      return dbp;
    }
    function tx(modo, fn) {
      return abre().then(function (db) {
        return new Promise(function (res, rej) {
          var t = db.transaction("cola", modo), st = t.objectStore("cola"), out;
          out = fn(st);
          t.oncomplete = function () { res(out && out.result !== undefined ? out.result : out); };
          t.onerror = function () { rej(t.error); };
        });
      });
    }
    return {
      add:  function (it) { return tx("readwrite", function (s) { return s.put(it); }); },
      all:  function ()   { return tx("readonly",  function (s) { return s.getAll(); }); },
      del:  function (id) { return tx("readwrite", function (s) { return s.delete(id); }); }
    };
  })();

  var fotosPend = 0;
  var firmadas = {};   // path -> {url, exp}

  // Reduce la foto antes de subirla: ~150 KB en vez de 4 MB.
  async function comprime(file) {
    var MAX = 1400, Q = 0.72;
    try {
      var bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      var s = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
      var c = document.createElement("canvas");
      c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      bmp.close && bmp.close();
      return await new Promise(function (res) { c.toBlob(function (b) { res(b || file); }, "image/jpeg", Q); });
    } catch (e) {
      return file;   // navegador viejo: se sube tal cual
    }
  }

  function bultoPorId(id) {
    for (var i = 0; i < S.bultos.length; i++) if (S.bultos[i].id === id) return S.bultos[i];
    return null;
  }

  async function adjuntaFotos(bultoId, paths) {
    var b = bultoPorId(bultoId);
    if (!b) return;
    await guardar(Object.assign({}, b, { fotos: (b.fotos || []).concat(paths) }));
  }

  async function subeFotos(bultoId, blobs) {
    var paths = [];
    for (var i = 0; i < blobs.length; i++) {
      var nombre = uuid();
      var path = bultoId + "/" + nombre + ".jpg";
      try {
        if (!navigator.onLine) throw new Error("offline");
        var r = await sb.storage.from("fotos").upload(path, blobs[i], { contentType: "image/jpeg", upsert: true });
        if (r.error) throw r.error;
        paths.push(path);
      } catch (e) {
        if (esDeRed(e)) {
          try { await IDB.add({ id: nombre, bultoId: bultoId, blob: blobs[i] }); fotosPend++; pintaRed(); }
          catch (e2) { toast("No se pudo guardar la foto sin señal."); }
        } else {
          toast("No se subió la foto: " + (e.message || e));
        }
      }
    }
    if (paths.length) await adjuntaFotos(bultoId, paths);
  }

  async function vaciarFotos() {
    if (!sb || !navigator.onLine || !window.indexedDB) return;
    var items;
    try { items = await IDB.all(); } catch (e) { return; }
    fotosPend = items.length;
    for (var i = 0; i < items.length; i++) {
      var it = items[i], path = it.bultoId + "/" + it.id + ".jpg";
      try {
        var r = await sb.storage.from("fotos").upload(path, it.blob, { contentType: "image/jpeg", upsert: true });
        if (r.error) throw r.error;
        await adjuntaFotos(it.bultoId, [path]);
        await IDB.del(it.id); fotosPend--;
      } catch (e) {
        if (esDeRed(e)) break;
        await IDB.del(it.id); fotosPend--;   // el bulto ya no existe: se descarta
      }
    }
    pintaRed();
  }

  // Ligas temporales (1 h) para ver las fotos del bucket privado, en un solo viaje.
  async function urlsDe(paths) {
    var faltan = paths.filter(function (p) {
      return !firmadas[p] || firmadas[p].exp < Date.now() + 60000;
    });
    if (faltan.length && sb && navigator.onLine) {
      try {
        var r = await sb.storage.from("fotos").createSignedUrls(faltan, 3600);
        (r.data || []).forEach(function (x) {
          if (x && x.signedUrl) firmadas[x.path] = { url: x.signedUrl, exp: Date.now() + 3400000 };
        });
      } catch (e) { /* sin señal: las miniaturas se quedan vacías */ }
    }
  }

  async function resuelveFotos() {
    var ns = document.querySelectorAll("img[data-foto]");
    if (!ns.length) return;
    var paths = [];
    for (var i = 0; i < ns.length; i++) {
      var p = ns[i].getAttribute("data-foto");
      if (p && paths.indexOf(p) < 0) paths.push(p);
    }
    await urlsDe(paths);
    var ns2 = document.querySelectorAll("img[data-foto]");
    for (var j = 0; j < ns2.length; j++) {
      var pp = ns2[j].getAttribute("data-foto");
      if (firmadas[pp] && ns2[j].src !== firmadas[pp].url) ns2[j].src = firmadas[pp].url;
    }
  }

  function miniatura(path, alt) {
    var im = document.createElement("img");
    im.className = "thumb"; im.alt = alt; im.loading = "lazy";
    im.setAttribute("data-foto", path);
    im.onclick = function (ev) { ev.stopPropagation(); abreVisor(path); };
    return im;
  }

  async function abreVisor(path) {
    await urlsDe([path]);
    if (!firmadas[path]) { toast("Necesitas señal para ver la foto."); return; }
    $("visorImg").src = firmadas[path].url;
    $("visor").hidden = false;
  }
  function cierraVisor() { $("visor").hidden = true; $("visorImg").removeAttribute("src"); }
  $("visorX").onclick = cierraVisor;
  $("visor").onclick = function (ev) { if (ev.target === $("visor")) cierraVisor(); };
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && !$("visor").hidden) cierraVisor();
  });

  /* ---------------- cola para trabajar sin internet ---------------- */

  function queue() { return ls(K.queue) || []; }
  function enqueue(op) { var q = queue(); q.push(op); ls(K.queue, q); pintaRed(); }
  function pintaRed() {
    var sinConfirmar = cuantasPendientes();
    var n = queue().length + fotosPend;
    var b = $("netBadge");
    if (!b) return;
    b.classList.toggle("net-alerta", sinConfirmar > 0);
    if (sinConfirmar) {
      b.hidden = false;
      b.textContent = sinConfirmar + " sin guardar · reintentar";
    } else if (!navigator.onLine) {
      b.hidden = false;
      b.textContent = n ? "Sin conexión · " + n + " por subir" : "Sin conexión";
    } else if (n) {
      b.hidden = false; b.textContent = "Subiendo " + n + "…";
    } else b.hidden = true;
  }

  var vaciando = false;
  async function vaciarCola() {
    if (vaciando || !sb || !navigator.onLine) return;
    var q = queue();
    if (!q.length) { pintaRed(); return; }
    vaciando = true;
    try {
      while (q.length) {
        var op = q[0];
        try {
          if (op.t === "upsert") {
            if (op.tabla === "cosas") await empujaCosa(op.row);
            else await empuja(op.row);
          } else if (op.t === "delete") {
            var r = await sb.from(op.tabla || "bultos").delete().eq("id", op.id);
            if (r.error) throw r.error;
          }
        } catch (e) {
          if (esDeRed(e)) break;          // seguimos sin internet: lo dejamos pendiente
          // error de datos: lo tiramos para no atorar la cola
          console.warn("Se descartó una operación pendiente:", e);
        }
        q.shift(); ls(K.queue, q);
      }
    } finally { vaciando = false; pintaRed(); }
  }
  function esDeRed(e) {
    if (!navigator.onLine) return true;
    var m = String((e && (e.message || e.error_description)) || "").toLowerCase();
    return m.indexOf("fetch") >= 0 || m.indexOf("network") >= 0 || m.indexOf("timeout") >= 0;
  }

  async function empuja(row) {
    var r = await sb.from("bultos").upsert(row, { onConflict: "id" });
    if (r.error) {
      // choque de código (los dos capturaron al mismo tiempo): renumera y reintenta
      if (String(r.error.code) === "23505") {
        row.code = siguienteCodigo(row.clave, true);
        var r2 = await sb.from("bultos").upsert(row, { onConflict: "id" });
        if (r2.error) throw r2.error;
        mergeLocal(row); render();
        return;
      }
      throw r.error;
    }
  }

  /* ---------------- códigos ---------------- */

  function siguienteCodigo(clave, forzarNuevo) {
    var max = 0;
    S.bultos.forEach(function (b) {
      if (b.clave !== clave) return;
      var m = /(\d+)\s*$/.exec(b.code || "");
      if (m) { var v = parseInt(m[1], 10); if (v > max) max = v; }
    });
    if (forzarNuevo) max += Math.floor(Math.random() * 3) + 1;
    var s = String(max + 1); while (s.length < 3) s = "0" + s;
    return clave + "-" + s;
  }
  function claveActual() {
    if (S.ctx.clave) return S.ctx.clave;
    return (S.config.origenes[0] || {}).clave || "BLT";
  }
  function nombreOrigen(clave) {
    var n = "";
    S.config.origenes.forEach(function (o) { if (o.clave === clave) n = o.nombre; });
    return n;
  }

  /* ---------------- estado local ---------------- */

  function mergeLocal(row) {
    var i = -1;
    for (var j = 0; j < S.bultos.length; j++) if (S.bultos[j].id === row.id) { i = j; break; }
    if (i >= 0) S.bultos[i] = row; else S.bultos.push(row);
    ls(K.bultos, S.bultos);
  }
  function mergeCosa(row) {
    var i = -1;
    for (var j = 0; j < S.cosas.length; j++) if (S.cosas[j].id === row.id) { i = j; break; }
    if (i >= 0) S.cosas[i] = row; else S.cosas.push(row);
    ls(K.cosas, S.cosas);
  }
  async function empujaCosa(row) {
    var r = await sb.from("cosas").upsert(row, { onConflict: "id" });
    if (r.error) throw r.error;
  }
  function quitaLocal(id) {
    S.bultos = S.bultos.filter(function (b) { return b.id !== id; });
    ls(K.bultos, S.bultos);
  }
  function ordenados() {
    return S.bultos.slice().sort(function (a, b) {
      return String(a.code || "").localeCompare(String(b.code || ""), "es", { numeric: true });
    });
  }
  function cuartosOrigenUsados() {
    var s = {};
    S.bultos.forEach(function (b) { if (b.cuarto_origen) s[b.cuarto_origen] = 1; });
    return Object.keys(s).sort(function (a, b) { return a.localeCompare(b, "es"); });
  }
  function destinos() {
    var s = {};
    (S.config.destinos || []).forEach(function (d) { s[d] = 1; });
    S.bultos.forEach(function (b) { if (b.destino) s[b.destino] = 1; });
    return Object.keys(s).sort(function (a, b) { return a.localeCompare(b, "es"); });
  }

  /* =====================================================
     ACCESO
     ===================================================== */

  var modoRegistro = false;

  function mostrarLogin(msg) {
    $("boot").hidden = true;
    $("app").hidden = true;
    $("login").hidden = false;
    if (msg) { $("loginErr").textContent = msg; $("loginErr").hidden = false; }
  }

  $("loginToggle").onclick = function () {
    modoRegistro = !modoRegistro;
    $("loginBtn").textContent = modoRegistro ? "Crear mi acceso" : "Entrar";
    $("loginToggle").textContent = modoRegistro
      ? "Ya tengo contraseña — entrar"
      : "Es mi primera vez — crear mi contraseña";
    $("loginPass").autocomplete = modoRegistro ? "new-password" : "current-password";
    $("loginErr").hidden = true;
  };

  $("loginForm").onsubmit = async function (ev) {
    ev.preventDefault();
    var email = $("loginEmail").value.trim();
    var pass = $("loginPass").value;
    var btn = $("loginBtn");
    btn.disabled = true; btn.textContent = "Un momento…";
    $("loginErr").hidden = true;
    try {
      var r = modoRegistro
        ? await sb.auth.signUp({ email: email, password: pass })
        : await sb.auth.signInWithPassword({ email: email, password: pass });
      if (r.error) throw r.error;
      if (!r.data.session) throw new Error("Revisa tu correo para confirmar la cuenta y vuelve a entrar.");
      await arrancarApp();
    } catch (e) {
      var m = String(e.message || e);
      if (/invalid login/i.test(m)) m = "Correo o contraseña incorrectos.";
      if (/already registered|already been registered/i.test(m)) m = "Ese correo ya tiene acceso. Usa “Ya tengo contraseña”.";
      if (/password/i.test(m) && /6/.test(m)) m = "La contraseña necesita al menos 6 caracteres.";
      $("loginErr").textContent = m; $("loginErr").hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = modoRegistro ? "Crear mi acceso" : "Entrar";
    }
  };

  $("btnOut").onclick = async function () {
    if (queue().length && !confirm("Tienes cambios sin subir. ¿Salir de todos modos?")) return;
    await sb.auth.signOut();
    location.reload();
  };

  /* =====================================================
     CARGA DE DATOS
     ===================================================== */

  async function arrancarApp() {
    $("login").hidden = true;
    $("boot").hidden = false;
    $("bootMsg").textContent = "Cargando bultos…";

    var u = (await sb.auth.getUser()).data.user;
    var correo = (u && u.email) || "";
    miCorreo = correo;
    yo = correo.split("@")[0].replace(/[._-]/g, " ");
    yo = yo.charAt(0).toUpperCase() + yo.slice(1);

    // caché primero: la app abre al instante aunque no haya señal
    var cb = ls(K.bultos), cc = ls(K.config), cx = ls(K.ctx), cs = ls(K.cosas);
    if (Array.isArray(cb)) S.bultos = cb;
    if (Array.isArray(cs)) S.cosas = cs;
    if (cc) S.config = cc;
    if (cx) S.ctx = Object.assign(S.ctx, cx);
    var cxc = ls(K.ctxCosas);
    if (cxc) S.ctxCosas = Object.assign(S.ctxCosas, cxc);

    $("app").hidden = false;
    $("boot").hidden = true;
    pintaCtxControles();
    render();

    await verificaAcceso();

    var ok = await recargar();
    if (!ok && !S.bultos.length) {
      toast("No se pudo conectar. Revisa tu internet.");
    }
    suscribir();
    vaciarCola();
    vaciarFotos();
  }

  async function recargar() {
    try {
      var rc = await sb.from("config").select("*").eq("id", 1).maybeSingle();
      if (rc.error) throw rc.error;
      if (rc.data) {
        S.config = {
          origenes: (rc.data.origenes && rc.data.origenes.length) ? rc.data.origenes : CFG_DEF.origenes,
          destinos: rc.data.destinos || CFG_DEF.destinos,
          categorias: (rc.data.categorias && rc.data.categorias.length) ? rc.data.categorias : CFG_DEF.categorias
        };
        ls(K.config, S.config);
      }
      var rb = await sb.from("bultos").select("*");
      if (rb.error) throw rb.error;
      // lo que sigue en la cola manda sobre lo que vino del servidor
      // Lo que el servidor todavía no confirma MANDA sobre lo que responde,
      // y si no viene en su respuesta, se conserva. Ésta es la regla que
      // evita que una recarga se lleve lo capturado.
      var pen = pendientes();
      var localB = {}, localC = {};
      S.bultos.forEach(function (b) { if (pen[b.id]) localB[b.id] = b; });
      S.cosas.forEach(function (c) { if (pen[c.id]) localC[c.id] = c; });

      S.bultos = rb.data.map(function (r) { return localB[r.id] || r; });
      Object.keys(localB).forEach(function (id) {
        if (!S.bultos.some(function (b) { return b.id === id; })) S.bultos.push(localB[id]);
      });
      ls(K.bultos, S.bultos);

      var rcos = await sb.from("cosas").select("*");
      if (!rcos.error) {
        S.cosas = rcos.data.map(function (r) { return localC[r.id] || r; });
        Object.keys(localC).forEach(function (id) {
          if (!S.cosas.some(function (c) { return c.id === id; })) S.cosas.push(localC[id]);
        });
        ls(K.cosas, S.cosas);
      }

      pintaCtxControles();
      render();
      return true;
    } catch (e) {
      if (/permission|policy|row-level/i.test(String(e.message || ""))) {
        mostrarLogin("Tu correo no está en la lista de acceso. Agrégalo en Supabase → Table editor → permitidos.");
        return false;
      }
      console.warn(e);
      return false;
    }
  }

  function suscribir() {
    try {
      sb.channel("mudanza")
        .on("postgres_changes", { event: "*", schema: "public", table: "bultos" }, function (p) {
          if (p.eventType === "DELETE") quitaLocal(p.old.id);
          else mergeLocal(p.new);
          render();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "cosas" }, function (p) {
          if (p.eventType === "DELETE") {
            S.cosas = S.cosas.filter(function (c) { return c.id !== p.old.id; });
            ls(K.cosas, S.cosas);
          } else mergeCosa(p.new);
          render();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "config" }, function (p) {
          if (p.new) {
            S.config = {
              origenes: (p.new.origenes && p.new.origenes.length) ? p.new.origenes : CFG_DEF.origenes,
              destinos: p.new.destinos || CFG_DEF.destinos,
              categorias: (p.new.categorias && p.new.categorias.length) ? p.new.categorias : CFG_DEF.categorias
            };
            ls(K.config, S.config); pintaCtxControles(); render();
          }
        })
        .subscribe();
    } catch (e) { console.warn("Sin tiempo real:", e); }
  }

  /* =====================================================
     GUARDAR
     ===================================================== */

  async function guardar(row, aviso) {
    if (bloqueado()) return;
    row.actualizado_en = new Date().toISOString();
    row.actualizado_por = yo;
    mergeLocal(row);
    marcaPendiente(row.id, "bultos");
    alDiario("bultos", row);
    render();
    try {
      if (!navigator.onLine) throw new Error("offline");
      await empuja(row);
      confirmaGuardado(row.id);
      if (aviso) toast(aviso);
    } catch (e) {
      if (esDeRed(e)) {
        enqueue({ t: "upsert", row: row });
        if (aviso) toast(aviso + " · se sube al volver la señal");
      } else {
        toast(mensajeDeError(e));
      }
    }
  }

  async function borrar(id) {
    if (bloqueado()) return;
    confirmaGuardado(id);
    var previo = bultoPorId(id);
    var susFotos = (previo && previo.fotos) || [];
    quitaLocal(id); render();
    try {
      if (!navigator.onLine) throw new Error("offline");
      var r = await sb.from("bultos").delete().eq("id", id);
      if (r.error) throw r.error;
      if (susFotos.length) { try { await sb.storage.from("fotos").remove(susFotos); } catch (e2) { /* huérfanas */ } }
    } catch (e) {
      if (esDeRed(e)) enqueue({ t: "delete", id: id });
      else toast("No se pudo borrar: " + (e.message || e));
    }
  }

  /* =====================================================
     CAPTURAR
     ===================================================== */

  function pintaCtxControles() {
    // orígenes
    var seg = $("segOrigen"); clear(seg);
    if (!S.ctx.clave) S.ctx.clave = (S.config.origenes[0] || {}).clave || "BLT";
    S.config.origenes.forEach(function (o) {
      var b = el("button", null, o.nombre);
      b.type = "button";
      b.setAttribute("aria-pressed", S.ctx.clave === o.clave ? "true" : "false");
      b.onclick = function () { S.ctx.clave = o.clave; guardaCtx(); pintaCtxControles(); pintaCaptura(); };
      seg.appendChild(b);
    });
    // quién lo traslada
    var stg = $("segTraslado"); clear(stg);
    TRASLADOS.forEach(function (t) {
      var b = el("button", null, t.n);
      b.type = "button";
      b.setAttribute("aria-pressed", S.ctx.traslado === t.k ? "true" : "false");
      b.onclick = function () { S.ctx.traslado = t.k; guardaCtx(); pintaCtxControles(); pintaCaptura(); };
      stg.appendChild(b);
    });
    // destino
    var sd = $("cDestino"); clear(sd);
    sd.appendChild(new Option("— elegir cuarto —", ""));
    destinos().forEach(function (d) { sd.appendChild(new Option(d, d)); });
    sd.value = S.ctx.destino || "";
    // tipo / estado
    var st = $("cTipo"); clear(st);
    TIPOS.forEach(function (t) { st.appendChild(new Option(t.n, t.k)); });
    st.value = S.ctx.tipo;
    var se = $("cEstado"); clear(se);
    ESTADOS.forEach(function (e) { se.appendChild(new Option(e.n, e.k)); });
    se.value = S.ctx.estado;
    // cuartos de origen sugeridos
    var dl = $("dlCuartos"); clear(dl);
    cuartosOrigenUsados().forEach(function (c) { dl.appendChild(new Option(c)); });
    $("cOrigenCuarto").value = S.ctx.cuarto_origen || "";
    $("cLugar").value = S.ctx.lugar || "";
  }

  function guardaCtx() { ls(K.ctx, S.ctx); }

  function leeCtx() {
    S.ctx.cuarto_origen = $("cOrigenCuarto").value.trim();
    S.ctx.destino = $("cDestino").value;
    S.ctx.lugar = $("cLugar").value.trim();
    S.ctx.tipo = $("cTipo").value;
    S.ctx.estado = $("cEstado").value;
    guardaCtx();
  }
  ["cOrigenCuarto", "cDestino", "cLugar", "cTipo", "cEstado"].forEach(function (id) {
    $(id).addEventListener("change", function () { leeCtx(); pintaCaptura(); });
  });

  $("ctxBar").onclick = function () {
    var p = $("ctxPanel"), abierto = !p.hidden;
    p.hidden = abierto;
    $("ctxBar").setAttribute("aria-expanded", abierto ? "false" : "true");
    if (!abierto) $("cOrigenCuarto").focus();
  };
  $("ctxDone").onclick = function () {
    leeCtx(); $("ctxPanel").hidden = true;
    $("ctxBar").setAttribute("aria-expanded", "false");
    pintaCaptura(); $("capContenido").focus();
  };

  function pintaTipos() {
    var host = $("tipos"); clear(host);
    TIPOS.forEach(function (t) {
      var b = el("button");
      b.type = "button";
      b.setAttribute("aria-pressed", S.ctx.tipo === t.k ? "true" : "false");
      b.appendChild(el("b", null, t.icono));
      b.appendChild(document.createTextNode(t.corto));
      b.onclick = function () {
        S.ctx.tipo = t.k; guardaCtx();
        $("cTipo").value = t.k;
        pintaCaptura();
        $("capContenido").focus();
      };
      host.appendChild(b);
    });
  }

  function pintaCaptura() {
    var partes = [nombreOrigen(claveActual()) || "—"];
    if (S.ctx.cuarto_origen) partes.push(S.ctx.cuarto_origen);
    $("ctxLine").textContent = partes.join(" · ") + " → " + (S.ctx.destino || "sin asignar")
      + (S.ctx.traslado === "yo" ? "  ·  lo llevo yo" : "");
    $("nextCode").textContent = siguienteCodigo(claveActual());

    var T = textos();
    pintaTipos();
    $("capCodeK").textContent = T.code;
    $("capFieldK").textContent = T.campo;
    $("capContenido").placeholder = T.ph;
    $("capHint").textContent = T.hint;
    $("capPrimeroTxt").textContent = T.primero;
    $("capCount").textContent = S.sesion.length ? S.sesion.length + " en esta sesión" : "";
    $("btnUndo").hidden = !S.sesion.length;

    var r = $("recent"); clear(r);
    S.sesion.slice(-8).reverse().forEach(function (id) {
      var b = null;
      for (var i = 0; i < S.bultos.length; i++) if (S.bultos[i].id === id) b = S.bultos[i];
      if (!b) return;
      var btn = el("button", null, b.code);
      btn.type = "button";
      btn.title = "Editar " + b.code;
      btn.onclick = function () { abreForm(b); };
      r.appendChild(btn);
    });
  }

  // Corta por renglón, no por coma: así "los platos de la vajilla, frágil"
  // se queda como una sola nota en vez de partirse en dos.
  function partirContenido(txt) {
    return txt.split(/[\n;]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function nuevoBulto(contenido) {
    var clave = claveActual();
    return {
      id: uuid(),
      code: siguienteCodigo(clave),
      clave: clave,
      origen: nombreOrigen(clave),
      cuarto_origen: S.ctx.cuarto_origen || "",
      tipo: S.ctx.tipo || "caja",
      estado: S.ctx.estado || "empacado",
      destino: S.ctx.destino || "",
      lugar: S.ctx.lugar || "",
      traslado: S.ctx.traslado || "mudanzera",
      contenido: contenido,
      notas: "",
      fotos: [],
      fragil: $("capFragil").checked,
      abrir_primero: $("capPrimero").checked,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
      actualizado_por: yo
    };
  }

  /* ---------- fotos en la pantalla de captura ---------- */
  var capFotos = [];   // [{blob, url}]

  function pintaCapThumbs() {
    var host = $("capThumbs"); clear(host);
    capFotos.forEach(function (f, i) {
      var w = el("div", "thumb-wrap");
      var im = document.createElement("img");
      im.className = "thumb"; im.src = f.url; im.alt = "Foto por subir";
      im.onclick = function () { $("visorImg").src = f.url; $("visor").hidden = false; };
      var x = el("button", "thumb-x", "✕");
      x.type = "button"; x.title = "Quitar foto";
      x.onclick = function () { URL.revokeObjectURL(f.url); capFotos.splice(i, 1); pintaCapThumbs(); };
      w.appendChild(im); w.appendChild(x);
      host.appendChild(w);
    });
  }

  $("btnFoto").onclick = function () { $("capFile").click(); };
  $("capFile").onchange = async function () {
    var files = Array.prototype.slice.call($("capFile").files || []);
    $("capFile").value = "";
    for (var i = 0; i < files.length; i++) {
      var b = await comprime(files[i]);
      capFotos.push({ blob: b, url: URL.createObjectURL(b) });
    }
    pintaCapThumbs();
  };

  async function guardarYSeguir() {
    var txt = $("capContenido").value.trim();
    if (!txt && !capFotos.length) {
      $("capContenido").focus();
      toast(textos().falta);
      return;
    }
    var guardado = textos().guardado;
    leeCtx();
    var row = nuevoBulto(partirContenido(txt));
    var fotos = capFotos.slice();
    S.sesion.push(row.id);
    capFotos.forEach(function (f) { URL.revokeObjectURL(f.url); });
    capFotos = []; pintaCapThumbs();
    $("capContenido").value = "";
    $("capFragil").checked = false;
    $("capPrimero").checked = false;
    await guardar(row, "✓ " + row.code + " " + guardado);
    pintaCaptura();
    $("capContenido").focus();
    // la subida va por detrás: no detiene la siguiente caja
    if (fotos.length) subeFotos(row.id, fotos.map(function (f) { return f.blob; }));
  }

  $("btnSaveNext").onclick = guardarYSeguir;
  $("capContenido").addEventListener("keydown", function (ev) {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") { ev.preventDefault(); guardarYSeguir(); }
  });

  $("btnUndo").onclick = async function () {
    var id = S.sesion.pop();
    if (!id) return;
    var b = null;
    for (var i = 0; i < S.bultos.length; i++) if (S.bultos[i].id === id) b = S.bultos[i];
    await borrar(id);
    toast((b ? b.code : "El último bulto") + " se eliminó");
    pintaCaptura();
  };

  /* ---------- dictado por voz ---------- */
  (function micSetup() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    var btn = $("btnMic"); btn.hidden = false;
    var rec = new SR(), activo = false, base = "";
    rec.lang = "es-MX"; rec.continuous = true; rec.interimResults = true;
    rec.onresult = function (ev) {
      var txt = "";
      for (var i = ev.resultIndex; i < ev.results.length; i++) txt += ev.results[i][0].transcript;
      $("capContenido").value = (base ? base + ", " : "") + txt.trim();
    };
    rec.onend = function () { activo = false; btn.classList.remove("mic-on"); btn.textContent = "🎤 Dictar"; };
    rec.onerror = function () { toast("No se pudo escuchar. Revisa el permiso del micrófono."); };
    btn.onclick = function () {
      if (activo) { rec.stop(); return; }
      base = $("capContenido").value.trim();
      try { rec.start(); activo = true; btn.classList.add("mic-on"); btn.textContent = "■ Detener"; }
      catch (e) { toast("El dictado ya estaba activo."); }
    };
  })();

  /* ---------- pegar una lista ---------- */
  $("btnPaste").onclick = function () {
    leeCtx();
    abreModal("Pegar una lista", function (body, foot, cerrar) {
      var ta = el("textarea");
      ta.style.minHeight = "220px";
      ta.placeholder = "Un renglón = una caja.\n\nvasos, copas, jarra\nollas y sartenes\nlicuadora y extractor";
      var l = el("label", "fl");
      l.appendChild(el("span", null, "Una caja por renglón"));
      l.appendChild(ta);
      l.appendChild(el("span", "hint",
        "Todas se crean en: " + (nombreOrigen(claveActual()) || "—") +
        (S.ctx.cuarto_origen ? " · " + S.ctx.cuarto_origen : "") +
        " → " + (S.ctx.destino || "sin asignar")));
      body.appendChild(l);
      var cuenta = el("p", "hint", "");
      body.appendChild(cuenta);
      ta.addEventListener("input", function () {
        var n = ta.value.split("\n").filter(function (s) { return s.trim(); }).length;
        cuenta.textContent = n ? "Se van a crear " + n + " bultos." : "";
      });

      var ok = el("button", "btn btn-p", "Crear todos");
      ok.onclick = async function () {
        var lineas = ta.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
        if (!lineas.length) return;
        ok.disabled = true; ok.textContent = "Creando…";
        for (var i = 0; i < lineas.length; i++) {
          var row = nuevoBulto(partirContenido(lineas[i]));
          S.sesion.push(row.id);
          await guardar(row);
        }
        cerrar();
        toast(lineas.length + " bultos creados");
        pintaCaptura();
      };
      foot.appendChild(ok);
      var no = el("button", "btn", "Cancelar"); no.onclick = cerrar; foot.appendChild(no);
      setTimeout(function () { ta.focus(); }, 60);
    });
  };

  /* =====================================================
     LISTA DE BULTOS
     ===================================================== */

  function coincide(b) {
    var F = S.filtros;
    if (Object.keys(F.estados).length && !F.estados[b.estado]) return false;
    if (Object.keys(F.origenes).length && !F.origenes[b.origen]) return false;
    if (F.destino && b.destino !== F.destino) return false;
    if (F.traslado && (b.traslado || "mudanzera") !== F.traslado) return false;
    if (F.frag && !b.fragil) return false;
    if (F.first && !b.abrir_primero) return false;
    if (F.q) {
      var hay = [b.code, b.origen, b.cuarto_origen, b.destino, b.lugar, b.notas, tipoNombre(b.tipo)]
        .concat(b.contenido || []).join(" ").toLowerCase();
      var t = F.q.toLowerCase().split(/\s+/).filter(Boolean);
      for (var i = 0; i < t.length; i++) if (hay.indexOf(t[i]) < 0) return false;
    }
    return true;
  }
  function filtrados() { return ordenados().filter(coincide); }

  function pill(e) {
    var p = el("span", "pill", e.n);
    p.style.background = softVar(e.c); p.style.color = colVar(e.c);
    return p;
  }

  function tarjeta(b) {
    var e = estadoDef(b.estado);
    var art = el("article", "bulto");
    var st = el("div", "stripe"); st.style.background = colVar(e.c); art.appendChild(st);
    var body = el("div", "b-body"); art.appendChild(body);

    var head = el("div", "b-head");
    head.appendChild(el("span", "code", b.code || "—"));
    if (b.tipo && b.tipo !== "caja") head.appendChild(el("span", "hint", tipoNombre(b.tipo)));
    head.appendChild(el("span", "spacer"));
    head.appendChild(pill(e));
    body.appendChild(head);

    var r = el("div", "route");
    r.appendChild(el("span", "from", (b.origen || "—") + (b.cuarto_origen ? " · " + b.cuarto_origen : "")));
    r.appendChild(el("span", "arrow", "→"));
    r.appendChild(el("span", "to", b.destino || "sin asignar"));
    body.appendChild(r);

    if (b.lugar) body.appendChild(el("div", "place", b.lugar));

    var cont = (b.contenido || []).filter(Boolean);
    if (cont.length) {
      var ul = el("ul", "contents");
      cont.slice(0, 6).forEach(function (c) { ul.appendChild(el("li", null, c)); });
      if (cont.length > 6) ul.appendChild(el("li", "more", "+" + (cont.length - 6) + " más"));
      body.appendChild(ul);
    }

    var fotos = (b.fotos || []).filter(Boolean);
    if (fotos.length) {
      var tw = el("div", "thumbs");
      fotos.slice(0, 4).forEach(function (p) { tw.appendChild(miniatura(p, "Contenido de " + b.code)); });
      body.appendChild(tw);
    }

    if (b.fragil || b.abrir_primero || b.traslado === "yo") {
      var fl = el("div", "flags");
      if (b.traslado === "yo") fl.appendChild(el("span", "tag tag-yo", "Lo llevo yo"));
      if (b.fragil) fl.appendChild(el("span", "tag tag-frag", "Frágil"));
      if (b.abrir_primero) fl.appendChild(el("span", "tag tag-first", "Abrir primero"));
      body.appendChild(fl);
    }

    var foot = el("div", "b-foot no-print");
    var idx = ESTADOS.map(function (x) { return x.k; }).indexOf(b.estado);
    if (idx >= 0 && idx < ESTADOS.length - 1) {
      var nx = ESTADOS[idx + 1];
      var adv = el("button", "btn btn-sm", "→ " + nx.n);
      adv.onclick = function () {
        var copia = Object.assign({}, b, { estado: nx.k });
        guardar(copia, b.code + ": " + nx.n);
      };
      foot.appendChild(adv);
    }
    var ed = el("button", "btn btn-sm btn-ghost", "Editar");
    ed.onclick = function () { abreForm(b); };
    foot.appendChild(ed);

    var who = el("div", "who");
    if (b.actualizado_en) who.appendChild(el("div", null, fechaCorta(b.actualizado_en)));
    if (b.actualizado_por) who.appendChild(el("div", null, b.actualizado_por));
    foot.appendChild(who);
    body.appendChild(foot);
    return art;
  }

  function fechaCorta(iso) {
    try { return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" }); }
    catch (e) { return ""; }
  }

  function pintaFiltros(counts) {
    var ce = $("chipsEstado"); clear(ce);
    ESTADOS.forEach(function (e) {
      var b = el("button", "chip-f");
      b.setAttribute("aria-pressed", S.filtros.estados[e.k] ? "true" : "false");
      b.appendChild(document.createTextNode(e.n));
      b.appendChild(el("span", "n", String(counts[e.k] || 0)));
      b.onclick = function () {
        if (S.filtros.estados[e.k]) delete S.filtros.estados[e.k]; else S.filtros.estados[e.k] = true;
        render();
      };
      ce.appendChild(b);
    });
    var co = $("chipsOrigen"); clear(co);
    S.config.origenes.forEach(function (o) {
      var n = S.bultos.filter(function (b) { return b.origen === o.nombre; }).length;
      var b = el("button", "chip-f");
      b.setAttribute("aria-pressed", S.filtros.origenes[o.nombre] ? "true" : "false");
      b.appendChild(document.createTextNode(o.nombre));
      b.appendChild(el("span", "n", String(n)));
      b.onclick = function () {
        if (S.filtros.origenes[o.nombre]) delete S.filtros.origenes[o.nombre];
        else S.filtros.origenes[o.nombre] = true;
        render();
      };
      co.appendChild(b);
    });
    var ct = $("chipsTraslado"); clear(ct);
    TRASLADOS.forEach(function (t) {
      var n = S.bultos.filter(function (b) { return (b.traslado || "mudanzera") === t.k; }).length;
      var b = el("button", "chip-f");
      b.setAttribute("aria-pressed", S.filtros.traslado === t.k ? "true" : "false");
      b.appendChild(document.createTextNode(t.n));
      b.appendChild(el("span", "n", String(n)));
      b.onclick = function () {
        S.filtros.traslado = (S.filtros.traslado === t.k) ? "" : t.k;
        render();
      };
      ct.appendChild(b);
    });

    $("chipFrag").setAttribute("aria-pressed", S.filtros.frag ? "true" : "false");
    $("chipFirst").setAttribute("aria-pressed", S.filtros.first ? "true" : "false");

    var dr = $("destRow"); clear(dr);
    dr.appendChild(el("span", "hint", "Cuarto destino:"));
    var sel = el("select"); sel.style.maxWidth = "260px";
    sel.appendChild(new Option("Todos", ""));
    destinos().forEach(function (d) { sel.appendChild(new Option(d, d)); });
    sel.value = S.filtros.destino;
    sel.onchange = function () { S.filtros.destino = sel.value; render(); };
    dr.appendChild(sel);
  }

  function pintaGrid() {
    var g = $("grid"); clear(g);
    var list = filtrados();
    if (!list.length) {
      var e = el("div", "empty");
      e.appendChild(el("b", null, S.bultos.length ? "Nada con esos filtros" : "Todavía no hay bultos"));
      e.appendChild(el("div", null, S.bultos.length
        ? "Quita un filtro o cambia la búsqueda."
        : "Ve a Capturar y da de alta el primero."));
      g.appendChild(e); return;
    }
    list.forEach(function (b) { g.appendChild(tarjeta(b)); });
    resuelveFotos();
  }

  /* =====================================================
     RESUMEN
     ===================================================== */

  function pintaResumen() {
    var host = $("viewResumen"); clear(host);
    var counts = {}; ESTADOS.forEach(function (e) { counts[e.k] = 0; });
    S.bultos.forEach(function (b) { if (counts[b.estado] != null) counts[b.estado]++; });

    var p0 = el("div", "panel");
    var sr = el("div", "stat-row");
    var t = el("div", "stat");
    t.appendChild(el("div", "k", "Bultos")); t.appendChild(el("div", "v", String(S.bultos.length)));
    sr.appendChild(t);
    ESTADOS.forEach(function (e) {
      var s = el("div", "stat");
      var k = el("div", "k", e.n); k.style.color = colVar(e.c);
      s.appendChild(k); s.appendChild(el("div", "v", String(counts[e.k])));
      sr.appendChild(s);
    });
    p0.appendChild(sr); host.appendChild(p0);

    var cols = el("div", "cols"); cols.style.marginTop = "14px"; host.appendChild(cols);
    cols.appendChild(tablaPor("Por cuarto en la casa nueva", "destino", "sin asignar"));
    cols.appendChild(tablaPor("Quién lo traslada", "traslado", "mudanzera", "Traslado",
      function (k) { return trasladoDef(k).n; }));
    cols.appendChild(tablaPor("Por origen", "origen", "—"));
    cols.appendChild(listaSimple("Para la primera noche",
      function (b) { return b.abrir_primero; },
      "Marca como “Abrir primero” sábanas, toallas, medicinas, cargadores y la cafetera."));
    cols.appendChild(listaSimple("Frágiles",
      function (b) { return b.fragil; },
      "Nada marcado como frágil todavía."));
  }

  function tablaPor(titulo, campo, vacio, encabezado, mapa) {
    var p = el("div", "panel");
    p.appendChild(el("h2", null, titulo));
    var g = {};
    S.bultos.forEach(function (b) {
      var k = b[campo] || vacio;
      if (mapa) k = mapa(k);
      if (!g[k]) g[k] = { total: 0, st: {} };
      g[k].total++; g[k].st[b.estado] = (g[k].st[b.estado] || 0) + 1;
    });
    var keys = Object.keys(g).sort(function (a, b) { return g[b].total - g[a].total; });
    var tw = el("div", "tablewrap"), tb = el("table");
    var th = el("thead"), trh = el("tr");
    trh.appendChild(el("th", null, encabezado || (campo === "destino" ? "Cuarto" : "Origen")));
    trh.appendChild(el("th", null, "Avance"));
    trh.appendChild(el("th", "num", "Bultos"));
    th.appendChild(trh); tb.appendChild(th);
    var body = el("tbody");
    if (!keys.length) {
      var tr0 = el("tr"), td0 = el("td", null, "Sin datos");
      td0.colSpan = 3; td0.style.color = "var(--ink-3)"; tr0.appendChild(td0); body.appendChild(tr0);
    }
    keys.forEach(function (k) {
      var gg = g[k], tr = el("tr");
      var c1 = el("td", null, k);
      if (campo === "destino") {
        c1.style.fontWeight = "600"; c1.style.cursor = "pointer"; c1.title = "Ver solo este cuarto";
        c1.onclick = function () { S.filtros.destino = (k === vacio ? "" : k); setTab("bultos"); render(); };
      }
      tr.appendChild(c1);
      var c2 = el("td"), bar = el("div", "minibar");
      ESTADOS.forEach(function (e) {
        var n = gg.st[e.k] || 0; if (!n) return;
        var i = el("i"); i.style.width = (n / gg.total * 100) + "%";
        i.style.background = colVar(e.c); i.title = e.n + ": " + n;
        bar.appendChild(i);
      });
      c2.appendChild(bar); tr.appendChild(c2);
      tr.appendChild(el("td", "num", String(gg.total)));
      body.appendChild(tr);
    });
    tb.appendChild(body); tw.appendChild(tb); p.appendChild(tw);
    return p;
  }

  function listaSimple(titulo, filtro, vacio) {
    var p = el("div", "panel");
    p.appendChild(el("h2", null, titulo));
    var tw = el("div", "tablewrap"), t = el("table"), tb = el("tbody");
    var list = ordenados().filter(filtro);
    if (!list.length) {
      var tr = el("tr"), td = el("td", null, vacio);
      td.colSpan = 3; td.style.color = "var(--ink-3)"; tr.appendChild(td); tb.appendChild(tr);
    }
    list.forEach(function (b) {
      var tr = el("tr");
      var c1 = el("td"); c1.appendChild(el("span", "code", b.code || "—")); tr.appendChild(c1);
      tr.appendChild(el("td", null, b.destino || (b.contenido || []).slice(0, 2).join(", ") || "—"));
      var c3 = el("td"); c3.appendChild(pill(estadoDef(b.estado))); tr.appendChild(c3);
      tr.style.cursor = "pointer";
      tr.onclick = function () { abreForm(b); };
      tb.appendChild(tr);
    });
    t.appendChild(tb); tw.appendChild(t); p.appendChild(tw);
    return p;
  }

  /* =====================================================
     ETIQUETAS
     ===================================================== */

  function pintaEtiquetas() {
    var host = $("labels"); clear(host);
    var list = filtrados();
    $("labelsHint").textContent = list.length + " etiqueta" + (list.length === 1 ? "" : "s") +
      " — usa los filtros de Bultos para elegir cuáles.";
    if (!list.length) {
      var e = el("div", "empty");
      e.appendChild(el("b", null, "Nada que etiquetar"));
      host.appendChild(e); return;
    }
    list.forEach(function (b) {
      var l = el("div", "label");
      var row = el("div", "lrow");
      row.appendChild(el("span", "lcode", b.code || "—"));
      var fl = el("div", "lflags");
      if (b.fragil) fl.appendChild(el("span", "tag tag-frag", "Frágil"));
      if (b.abrir_primero) fl.appendChild(el("span", "tag tag-first", "Abrir 1°"));
      row.appendChild(fl); l.appendChild(row);
      if (b.traslado === "yo") l.appendChild(el("div", "lyo", "No subir al camión"));
      l.appendChild(el("div", "ldest", b.destino || "Sin asignar"));
      if (b.lugar) l.appendChild(el("div", "lmeta", b.lugar));
      l.appendChild(el("div", "lmeta", "Viene de: " + (b.origen || "—") +
        (b.cuarto_origen ? " · " + b.cuarto_origen : "")));
      var c = (b.contenido || []).filter(Boolean);
      if (c.length) l.appendChild(el("div", "lcontents", c.join(" · ")));
      host.appendChild(l);
    });
  }

  /* =====================================================
     MODALES
     ===================================================== */

  var modalAbierto = false;
  function abreModal(titulo, llena) {
    if (modalAbierto) return;
    modalAbierto = true;
    var scrim = el("div", "scrim"), sheet = el("div", "sheet");
    var head = el("div", "sheet-head");
    head.appendChild(el("h2", null, titulo));
    var x = el("button", "btn btn-sm btn-ghost", "Cerrar"); x.style.marginLeft = "auto";
    head.appendChild(x); sheet.appendChild(head);
    var body = el("div", "sheet-body"); sheet.appendChild(body);
    var foot = el("div", "sheet-foot"); sheet.appendChild(foot);
    scrim.appendChild(sheet);

    function cerrar() {
      modalAbierto = false;
      if (scrim.parentNode) scrim.parentNode.removeChild(scrim);
      document.removeEventListener("keydown", onKey);
    }
    function onKey(ev) { if (ev.key === "Escape") cerrar(); }
    x.onclick = cerrar;
    scrim.onclick = function (ev) { if (ev.target === scrim) cerrar(); };
    document.addEventListener("keydown", onKey);

    llena(body, foot, cerrar);
    $("modalHost").appendChild(scrim);
  }

  function abreForm(b) {
    abreModal("Bulto " + (b.code || ""), function (body, foot, cerrar) {
      function campo(t, ctrl, hint) {
        var l = el("label", "fl"); l.appendChild(el("span", null, t)); l.appendChild(ctrl);
        if (hint) l.appendChild(el("span", "hint", hint));
        return l;
      }
      var selO = el("select");
      S.config.origenes.forEach(function (o) { selO.appendChild(new Option(o.nombre, o.clave)); });
      selO.value = b.clave;
      var inC = el("input"); inC.type = "text"; inC.value = b.cuarto_origen || "";
      var selT = el("select"); TIPOS.forEach(function (t) { selT.appendChild(new Option(t.n, t.k)); }); selT.value = b.tipo;
      var selE = el("select"); ESTADOS.forEach(function (e) { selE.appendChild(new Option(e.n, e.k)); }); selE.value = b.estado;
      var selD = el("select");
      selD.appendChild(new Option("— elegir cuarto —", ""));
      destinos().forEach(function (d) { selD.appendChild(new Option(d, d)); });
      selD.appendChild(new Option("+ Otro cuarto…", "__otro__"));
      selD.value = b.destino && destinos().indexOf(b.destino) >= 0 ? b.destino : (b.destino ? "__otro__" : "");
      var inOtro = el("input"); inOtro.type = "text"; inOtro.placeholder = "Nombre del cuarto";
      inOtro.value = selD.value === "__otro__" ? b.destino : "";
      inOtro.hidden = selD.value !== "__otro__";
      selD.onchange = function () { inOtro.hidden = selD.value !== "__otro__"; if (!inOtro.hidden) inOtro.focus(); };
      var inL = el("input"); inL.type = "text"; inL.value = b.lugar || "";
      var taC = el("textarea"); taC.value = (b.contenido || []).join("\n");
      var taN = el("textarea"); taN.value = b.notas || ""; taN.style.minHeight = "60px";
      var ckF = el("input"); ckF.type = "checkbox"; ckF.checked = !!b.fragil;
      var ckP = el("input"); ckP.type = "checkbox"; ckP.checked = !!b.abrir_primero;

      var f1 = el("div", "f2");
      f1.appendChild(campo("Viene de", selO)); f1.appendChild(campo("Cuarto de origen", inC));
      body.appendChild(f1);
      var f2 = el("div", "f2");
      f2.appendChild(campo("Qué es", selT)); f2.appendChild(campo("Estado", selE));
      body.appendChild(f2);
      var dw = el("div"); dw.style.display = "grid"; dw.style.gap = "8px";
      dw.appendChild(campo("Va en (casa nueva)", selD)); dw.appendChild(inOtro);
      body.appendChild(dw);
      var selTr = el("select");
      TRASLADOS.forEach(function (t) { selTr.appendChild(new Option(t.n, t.k)); });
      selTr.value = b.traslado || "mudanzera";

      body.appendChild(campo("Dónde se guarda", inL));
      body.appendChild(campo("Quién lo traslada", selTr));
      body.appendChild(campo("Contenido", taC, "Una nota breve, o un objeto por renglón."));
      body.appendChild(campo("Notas", taN));

      // --- fotos ---
      var fHost = el("div", "thumbs");
      var fFile = document.createElement("input");
      fFile.type = "file"; fFile.accept = "image/*"; fFile.capture = "environment";
      fFile.multiple = true; fFile.hidden = true;
      var fBtn = el("button", "btn btn-sm", "📷 Agregar foto");
      fBtn.type = "button";
      fBtn.onclick = function () { fFile.click(); };
      fFile.onchange = async function () {
        var files = Array.prototype.slice.call(fFile.files || []);
        fFile.value = "";
        fBtn.disabled = true; fBtn.textContent = "Subiendo…";
        var blobs = [];
        for (var i = 0; i < files.length; i++) blobs.push(await comprime(files[i]));
        await subeFotos(b.id, blobs);
        var fresco = bultoPorId(b.id);
        if (fresco) { b.fotos = fresco.fotos; pintaFotosModal(); }
        fBtn.disabled = false; fBtn.textContent = "📷 Agregar foto";
      };
      function pintaFotosModal() {
        clear(fHost);
        (b.fotos || []).forEach(function (p) {
          var w = el("div", "thumb-wrap");
          w.appendChild(miniatura(p, "Contenido de " + b.code));
          var x = el("button", "thumb-x", "✕");
          x.type = "button"; x.title = "Borrar foto";
          x.onclick = async function () {
            if (!confirm("¿Borrar esta foto?")) return;
            try { await sb.storage.from("fotos").remove([p]); } catch (e) { /* sigue */ }
            var fresco2 = bultoPorId(b.id) || b;
            await guardar(Object.assign({}, fresco2, {
              fotos: (fresco2.fotos || []).filter(function (q) { return q !== p; })
            }));
            b.fotos = (bultoPorId(b.id) || {}).fotos || [];
            pintaFotosModal();
          };
          w.appendChild(x); fHost.appendChild(w);
        });
        resuelveFotos();
      }
      var fWrap = el("div"); fWrap.style.display = "grid"; fWrap.style.gap = "8px";
      fWrap.appendChild(el("span", null, "Fotos"));
      fWrap.firstChild.style.cssText =
        "font-family:var(--ff-disp);text-transform:uppercase;letter-spacing:.06em;font-size:12.5px;font-weight:600;color:var(--ink-3)";
      fWrap.appendChild(fHost); fWrap.appendChild(fBtn); fWrap.appendChild(fFile);
      body.appendChild(fWrap);
      pintaFotosModal();
      var ch = el("div"); ch.style.display = "flex"; ch.style.gap = "18px"; ch.style.flexWrap = "wrap";
      var l1 = el("label", "chk"); l1.appendChild(ckF); l1.appendChild(document.createTextNode("Frágil"));
      var l2 = el("label", "chk"); l2.appendChild(ckP); l2.appendChild(document.createTextNode("Abrir primero"));
      ch.appendChild(l1); ch.appendChild(l2); body.appendChild(ch);

      var save = el("button", "btn btn-p", "Guardar");
      save.onclick = async function () {
        var clave = selO.value;
        var row = Object.assign({}, b, {
          clave: clave,
          origen: nombreOrigen(clave),
          cuarto_origen: inC.value.trim(),
          tipo: selT.value,
          estado: selE.value,
          destino: selD.value === "__otro__" ? inOtro.value.trim() : selD.value,
          lugar: inL.value.trim(),
          traslado: selTr.value,
          contenido: taC.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean),
          notas: taN.value.trim(),
          fragil: ckF.checked,
          abrir_primero: ckP.checked
        });
        if (row.clave !== b.clave) row.code = siguienteCodigo(row.clave);
        save.disabled = true;
        await guardar(row, row.code + " guardado");
        cerrar();
      };
      foot.appendChild(save);
      var dup = el("button", "btn", "Duplicar");
      dup.onclick = async function () {
        // la copia no hereda las fotos: son de esa caja en particular
        var copia = Object.assign({}, b, {
          id: uuid(), code: siguienteCodigo(b.clave), fotos: [],
          creado_en: new Date().toISOString()
        });
        S.sesion.push(copia.id);
        await guardar(copia, copia.code + " creado como copia");
        cerrar(); pintaCaptura();
      };
      foot.appendChild(dup);
      var del = el("button", "btn btn-danger", "Eliminar"); del.style.marginLeft = "auto";
      del.onclick = function () {
        if (!confirm("¿Eliminar " + b.code + "? No se puede deshacer.")) return;
        borrar(b.id); cerrar();
      };
      foot.appendChild(del);
    });
  }

  $("btnCfg").onclick = function () {
    abreModal("Ajustes", function (body, foot, cerrar) {
      var taO = el("textarea");
      taO.value = S.config.origenes.map(function (o) { return o.nombre + " | " + o.clave; }).join("\n");
      var lo = el("label", "fl");
      lo.appendChild(el("span", null, "Orígenes"));
      lo.appendChild(taO);
      lo.appendChild(el("span", "hint", "Un renglón por lugar: Nombre | CLAVE. La clave numera (DEP-001)."));
      body.appendChild(lo);

      var taD = el("textarea"); taD.style.minHeight = "180px";
      taD.value = (S.config.destinos || []).join("\n");
      var ld = el("label", "fl");
      ld.appendChild(el("span", null, "Cuartos de la casa nueva"));
      ld.appendChild(taD);
      ld.appendChild(el("span", "hint", "Un cuarto por renglón."));
      body.appendChild(ld);

      var taC = el("textarea"); taC.style.minHeight = "150px";
      taC.value = (S.config.categorias || CFG_DEF.categorias).join("\n");
      var lc = el("label", "fl");
      lc.appendChild(el("span", null, "Categorías"));
      lc.appendChild(taC);
      lc.appendChild(el("span", "hint",
        "Una por renglón. Son las opciones de “Categoría” en Mis cosas."));
      body.appendChild(lc);

      var exps = el("div"); exps.style.display = "flex"; exps.style.gap = "8px"; exps.style.flexWrap = "wrap";
      var exp = el("button", "btn btn-sm", "Respaldo de bultos (CSV)");
      exp.type = "button"; exp.onclick = exportaCSV;
      var exp2 = el("button", "btn btn-sm", "Respaldo de mis cosas (CSV)");
      exp2.type = "button"; exp2.onclick = exportaCosasCSV;
      var exp3 = el("button", "btn btn-sm", "Copia local de emergencia (JSON)");
      exp3.type = "button";
      exp3.onclick = function () {
        var d = ls(K.diario) || [];
        if (!d.length) { toast("El diario local está vacío."); return; }
        var a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)],
          { type: "application/json" }));
        a.download = "mudanza-diario-" + new Date().toISOString().slice(0, 10) + ".json";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      };
      exps.appendChild(exp); exps.appendChild(exp2); exps.appendChild(exp3);
      body.appendChild(exps);
      body.appendChild(el("span", "hint",
        "El diario guarda en este teléfono una copia de todo lo que capturaste, " +
        "aunque la nube haya fallado. Tiene " + ((ls(K.diario) || []).length) + " registros."));

      var save = el("button", "btn btn-p", "Guardar");
      save.onclick = async function () {
        var origenes = taO.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean)
          .map(function (s) {
            var p = s.split("|");
            var nombre = (p[0] || "").trim();
            var clave = ((p[1] || nombre.slice(0, 3)).trim().toUpperCase()).replace(/[^A-Z0-9]/g, "").slice(0, 5) || "BLT";
            return { nombre: nombre, clave: clave };
          }).filter(function (o) { return o.nombre; });
        var dest = taD.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
        var cats = taC.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
        if (!origenes.length) { toast("Deja al menos un origen."); return; }
        save.disabled = true;
        var r = await sb.from("config").upsert({
          id: 1, origenes: origenes, destinos: dest, categorias: cats
        });
        if (r.error) { toast("No se pudo guardar: " + r.error.message); save.disabled = false; return; }
        S.config = { origenes: origenes, destinos: dest, categorias: cats };
        ls(K.config, S.config);
        pintaCtxControles(); render(); cerrar();
      };
      foot.appendChild(save);
      var no = el("button", "btn", "Cancelar"); no.onclick = cerrar; foot.appendChild(no);
    });
  };

  function exportaCSV() {
    var cab = ["code", "origen", "cuarto_origen", "tipo", "estado", "traslado", "destino", "lugar",
      "contenido", "notas", "fragil", "abrir_primero", "fotos", "actualizado_en", "actualizado_por"];
    var filas = ordenados().map(function (b) {
      return cab.map(function (c) {
        if (c === "contenido") return csvq((b.contenido || []).join(" · "));
        if (c === "fotos") return csvq((b.fotos || []).length);
        if (c === "traslado") return csvq(trasladoDef(b.traslado).n);
        return csvq(b[c]);
      }).join(",");
    });
    bajaCSV("bultos", cab, filas);
  }

  function exportaCosasCSV() {
    var cab = ["nombre", "cantidad", "categoria", "estado", "donde_esta", "destino", "bulto",
      "precio_unitario", "total", "notas"];
    var filas = cosasOrdenadas().map(function (c) {
      var b = c.bulto_id ? bultoPorId(c.bulto_id) : null;
      var n = parseInt(c.cantidad, 10) || 0;
      return [
        csvq(c.nombre), csvq(n), csvq(c.categoria), csvq(estadoCosa(c.estado).n),
        csvq(c.ubicacion), csvq(c.destino), csvq(b ? b.code : ""),
        csvq(c.precio == null ? "" : c.precio),
        csvq(c.precio == null ? "" : c.precio * n),
        csvq(c.notas)
      ].join(",");
    });
    bajaCSV("mis-cosas", cab, filas);
  }

  function csvq(v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; }
  function bajaCSV(nombre, cab, filas) {
    var csv = "﻿" + cab.join(",") + "\n" + filas.join("\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "mudanza-" + nombre + "-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  /* =====================================================
     MIS COSAS — inventario de lo que tengo / lo que falta
     ===================================================== */

  async function guardarCosa(row, aviso) {
    if (bloqueado()) return;
    row.actualizado_en = new Date().toISOString();
    row.actualizado_por = yo;
    mergeCosa(row);
    marcaPendiente(row.id, "cosas");
    alDiario("cosas", row);
    render();
    try {
      if (!navigator.onLine) throw new Error("offline");
      await empujaCosa(row);
      confirmaGuardado(row.id);
      if (aviso) toast(aviso);
    } catch (e) {
      if (esDeRed(e)) {
        enqueue({ t: "upsert", tabla: "cosas", row: row });
        if (aviso) toast(aviso + " · se sube al volver la señal");
      } else {
        // El servidor lo rechazó. El renglón se queda marcado como
        // pendiente y NO se borra: el usuario decide si lo reintenta.
        toast(mensajeDeError(e));
      }
    }
  }

  // Traduce los errores del servidor a algo accionable
  function mensajeDeError(e) {
    var m = String((e && e.message) || e);
    if (/row-level security|violates row-level/i.test(m)) {
      return "Tu cuenta no tiene permiso para guardar. Revisa la tabla permitidos en Supabase.";
    }
    if (/column .* does not exist|schema cache/i.test(m)) {
      return "Falta correr el SQL más reciente en Supabase.";
    }
    return "No se pudo guardar: " + m;
  }

  async function borrarCosa(id) {
    if (bloqueado()) return;
    confirmaGuardado(id);
    S.cosas = S.cosas.filter(function (c) { return c.id !== id; });
    ls(K.cosas, S.cosas); render();
    try {
      if (!navigator.onLine) throw new Error("offline");
      var r = await sb.from("cosas").delete().eq("id", id);
      if (r.error) throw r.error;
    } catch (e) {
      if (esDeRed(e)) enqueue({ t: "delete", tabla: "cosas", id: id });
      else toast("No se pudo borrar: " + (e.message || e));
    }
  }

  /* ---------- dónde estoy mientras catalogo ---------- */

  function lugaresPosibles() {
    var l = S.config.origenes.map(function (o) { return o.nombre; });
    l.push("Casa nueva");
    return l;
  }
  function ubicaciones() {
    var s = {};
    S.cosas.forEach(function (c) { if (c.ubicacion) s[c.ubicacion] = 1; });
    return Object.keys(s).sort(function (a, b) { return a.localeCompare(b, "es"); });
  }
  function cuartosDeCosas() {
    var s = {};
    S.cosas.forEach(function (c) {
      var p = String(c.ubicacion || "").split(" · ");
      if (p[1]) s[p[1]] = 1;
    });
    cuartosOrigenUsados().forEach(function (c) { s[c] = 1; });
    return Object.keys(s).sort(function (a, b) { return a.localeCompare(b, "es"); });
  }
  function ubicacionActual() {
    return [S.ctxCosas.origen, S.ctxCosas.cuarto].filter(Boolean).join(" · ");
  }
  function guardaCtxCosas() { ls(K.ctxCosas, S.ctxCosas); }

  function pintaCtxCosas() {
    var seg = $("segCosaOrigen"); clear(seg);
    lugaresPosibles().forEach(function (n) {
      var b = el("button", null, n);
      b.type = "button";
      b.setAttribute("aria-pressed", S.ctxCosas.origen === n ? "true" : "false");
      b.onclick = function () {
        S.ctxCosas.origen = (S.ctxCosas.origen === n) ? "" : n;
        guardaCtxCosas(); pintaCtxCosas();
      };
      seg.appendChild(b);
    });

    var dl = $("dlCuartosCosas"); clear(dl);
    cuartosDeCosas().forEach(function (c) { dl.appendChild(new Option(c)); });
    $("cosaCuarto").value = S.ctxCosas.cuarto || "";

    var sc = $("cosaCatCtx"); clear(sc);
    sc.appendChild(new Option("— sin categoría —", ""));
    categorias().forEach(function (c) { sc.appendChild(new Option(c, c)); });
    sc.appendChild(new Option("+ Otra…", "__otra__"));
    var cat = S.ctxCosas.categoria || "";
    sc.value = (cat && categorias().indexOf(cat) >= 0) ? cat : (cat ? "__otra__" : "");
    $("cosaCatOtra").hidden = sc.value !== "__otra__";
    $("cosaCatOtra").value = sc.value === "__otra__" ? cat : "";

    var sd = $("cosaDestinoCtx"); clear(sd);
    sd.appendChild(new Option("— sin asignar —", ""));
    destinos().forEach(function (d) { sd.appendChild(new Option(d, d)); });
    sd.value = S.ctxCosas.destino || "";

    var u = ubicacionActual();
    var partes = ["Estoy en: " + (u || "sin especificar")];
    if (S.ctxCosas.categoria) partes.push(S.ctxCosas.categoria);
    $("ctxCosasLine").textContent = partes.join("  ·  ")
      + (S.ctxCosas.destino ? "  →  " + S.ctxCosas.destino : "");
  }

  function leeCtxCosas() {
    S.ctxCosas.cuarto = $("cosaCuarto").value.trim();
    S.ctxCosas.destino = $("cosaDestinoCtx").value;
    var sc = $("cosaCatCtx");
    S.ctxCosas.categoria = (sc.value === "__otra__")
      ? $("cosaCatOtra").value.trim()
      : sc.value;
    guardaCtxCosas();
  }
  $("cosaCuarto").addEventListener("change", function () { leeCtxCosas(); pintaCtxCosas(); });
  $("cosaDestinoCtx").addEventListener("change", function () { leeCtxCosas(); pintaCtxCosas(); });
  $("cosaCatOtra").addEventListener("change", function () { leeCtxCosas(); });
  $("cosaCatCtx").addEventListener("change", function () {
    var sc = $("cosaCatCtx");
    $("cosaCatOtra").hidden = sc.value !== "__otra__";
    if (!$("cosaCatOtra").hidden) { $("cosaCatOtra").focus(); return; }
    leeCtxCosas(); pintaCtxCosas();
  });

  $("ctxCosasBar").onclick = function () {
    var p = $("ctxCosasPanel"), abierto = !p.hidden;
    p.hidden = abierto;
    $("ctxCosasBar").setAttribute("aria-expanded", abierto ? "false" : "true");
    if (!abierto) $("cosaCuarto").focus();
  };
  $("ctxCosasDone").onclick = function () {
    leeCtxCosas();
    $("ctxCosasPanel").hidden = true;
    $("ctxCosasBar").setAttribute("aria-expanded", "false");
    pintaCtxCosas();
    $("cosaNombre").focus();
  };

  // Las de los ajustes más las que hayan escrito a mano
  function categorias() {
    var s = {};
    (S.config.categorias || CFG_DEF.categorias).forEach(function (c) { if (c) s[c] = 1; });
    S.cosas.forEach(function (c) { if (c.categoria) s[c.categoria] = 1; });
    return Object.keys(s).sort(function (a, b) { return a.localeCompare(b, "es"); });
  }
  function categoriasUsadas() {
    var s = {};
    S.cosas.forEach(function (c) { if (c.categoria) s[c.categoria] = 1; });
    return Object.keys(s).sort(function (a, b) { return a.localeCompare(b, "es"); });
  }

  function cosasOrdenadas() {
    return S.cosas.slice().sort(function (a, b) {
      return String(b.creado_en || "").localeCompare(String(a.creado_en || ""));
    });
  }

  function coincideCosa(c) {
    var F = S.filtrosCosas;
    if (Object.keys(F.estados).length && !F.estados[c.estado]) return false;
    if (F.categoria && (c.categoria || "") !== F.categoria) return false;
    if (F.ubicacion && (c.ubicacion || "") !== F.ubicacion) return false;
    if (F.q) {
      var hay = [c.nombre, c.categoria, c.ubicacion, c.destino, c.notas].join(" ").toLowerCase();
      var t = F.q.toLowerCase().split(/\s+/).filter(Boolean);
      for (var i = 0; i < t.length; i++) if (hay.indexOf(t[i]) < 0) return false;
    }
    return true;
  }

  // + / − en la lista: se agrupan los toques para no escribir en cada uno
  var pendienteCant = {};
  function ajustaCantidad(c, delta) {
    var nueva = Math.max(0, (parseInt(c.cantidad, 10) || 0) + delta);
    c.cantidad = nueva;          // pintado inmediato
    mergeCosa(c); render();
    clearTimeout(pendienteCant[c.id]);
    pendienteCant[c.id] = setTimeout(function () {
      var fresco = null;
      for (var i = 0; i < S.cosas.length; i++) if (S.cosas[i].id === c.id) fresco = S.cosas[i];
      if (fresco) guardarCosa(Object.assign({}, fresco));
    }, 700);
  }

  function pintaCosas() {
    pintaCtxCosas();
    // --- resumen de arriba ---
    var stats = $("cosasStats"); clear(stats);
    var sr = el("div", "stat-row");
    ESTADOS_COSA.forEach(function (e) {
      var list = S.cosas.filter(function (c) { return c.estado === e.k; });
      var unidades = list.reduce(function (a, c) { return a + (parseInt(c.cantidad, 10) || 0); }, 0);
      var s = el("div", "stat");
      var k = el("div", "k", e.n); k.style.color = colVar(e.c);
      s.appendChild(k);
      s.appendChild(el("div", "v", String(unidades)));
      var sub = list.length + (list.length === 1 ? " renglón" : " renglones");
      if (e.k === "falta") {
        var costo = list.reduce(function (a, c) {
          return a + (c.precio ? c.precio * (parseInt(c.cantidad, 10) || 0) : 0);
        }, 0);
        if (costo > 0) sub += " · " + pesos(costo);
      }
      s.appendChild(el("div", "hint", sub));
      sr.appendChild(s);
    });
    stats.appendChild(sr);

    // --- filtros ---
    var ce = $("chipsCosaEstado"); clear(ce);
    ESTADOS_COSA.forEach(function (e) {
      var n = S.cosas.filter(function (c) { return c.estado === e.k; }).length;
      var b = el("button", "chip-f");
      b.setAttribute("aria-pressed", S.filtrosCosas.estados[e.k] ? "true" : "false");
      b.appendChild(document.createTextNode(e.n));
      b.appendChild(el("span", "n", String(n)));
      b.onclick = function () {
        if (S.filtrosCosas.estados[e.k]) delete S.filtrosCosas.estados[e.k];
        else S.filtrosCosas.estados[e.k] = true;
        render();
      };
      ce.appendChild(b);
    });

    var cr = $("catRow"); clear(cr);
    cr.appendChild(el("span", "hint", "Categoría:"));
    var sel = el("select"); sel.style.maxWidth = "240px";
    sel.appendChild(new Option("Todas", ""));
    categorias().forEach(function (c) { sel.appendChild(new Option(c, c)); });
    sel.value = S.filtrosCosas.categoria;
    sel.onchange = function () { S.filtrosCosas.categoria = sel.value; render(); };
    cr.appendChild(sel);

    var ur = $("ubiRow"); clear(ur);
    ur.appendChild(el("span", "hint", "Dónde está:"));
    var su = el("select"); su.style.maxWidth = "240px";
    su.appendChild(new Option("Donde sea", ""));
    ubicaciones().forEach(function (u) { su.appendChild(new Option(u, u)); });
    su.value = S.filtrosCosas.ubicacion;
    su.onchange = function () { S.filtrosCosas.ubicacion = su.value; render(); };
    ur.appendChild(su);

    // --- lista ---
    var host = $("cosasList"); clear(host);
    var list = cosasOrdenadas().filter(coincideCosa);
    $("cosasCuenta").textContent = list.length
      ? list.length + (list.length === 1 ? " renglón" : " renglones")
      : "";
    if (!list.length) {
      var v = el("div", "empty");
      v.appendChild(el("b", null, S.cosas.length ? "Nada con esos filtros" : "Todavía no hay nada anotado"));
      v.appendChild(el("div", null, S.cosas.length
        ? "Quita un filtro o cambia la búsqueda."
        : "Usa el cuadro de arriba: escribe qué es, cuántos tienes, y agrégalo."));
      host.appendChild(v);
      return;
    }
    list.forEach(function (c) { host.appendChild(filaCosa(c)); });
  }

  function filaCosa(c) {
    var e = estadoCosa(c.estado);
    var row = el("div", "cosa");
    if (S.seleccion[c.id]) row.className = "cosa elegida";
    var st = el("div", "stripe"); st.style.background = colVar(e.c); row.appendChild(st);

    var sel = el("div", "cosa-sel");
    var chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = !!S.seleccion[c.id];
    chk.setAttribute("aria-label", "Seleccionar " + (c.nombre || ""));
    // sólo se repinta este renglón: con cientos de cosas, repintar todo
    // hace saltar la lista y pierde el scroll
    chk.onchange = function () {
      if (chk.checked) S.seleccion[c.id] = true; else delete S.seleccion[c.id];
      row.className = S.seleccion[c.id] ? "cosa elegida" : "cosa";
      pintaSelBar();
    };
    sel.appendChild(chk);
    row.appendChild(sel);

    var cant = el("div", "cosa-cant");
    var menos = el("button", null, "−");
    menos.type = "button"; menos.title = "Quitar uno";
    menos.setAttribute("aria-label", "Quitar uno de " + c.nombre);
    menos.onclick = function () { ajustaCantidad(c, -1); };
    var n = el("span", "cosa-n", String(c.cantidad));
    var mas = el("button", null, "+");
    mas.type = "button"; mas.title = "Agregar uno";
    mas.setAttribute("aria-label", "Agregar uno a " + c.nombre);
    mas.onclick = function () { ajustaCantidad(c, 1); };
    cant.appendChild(menos); cant.appendChild(n); cant.appendChild(mas);
    row.appendChild(cant);

    var mid = el("div", "cosa-mid");
    mid.appendChild(el("div", "cosa-nom", c.nombre || "(sin nombre)"));
    var meta = [];
    if (c.ubicacion) meta.push(c.ubicacion);
    if (c.categoria) meta.push(c.categoria);
    if (c.destino) meta.push("→ " + c.destino);
    if (c.bulto_id) {
      var b = bultoPorId(c.bulto_id);
      if (b) meta.push(b.code);
    }
    meta.push(e.n);
    var m = el("div", "cosa-meta", meta.join(" · "));
    mid.appendChild(m);
    mid.onclick = function () { abreFormCosa(c); };
    mid.title = "Editar " + (c.nombre || "");
    row.appendChild(mid);

    var right = el("div", "cosa-right");
    if (c.precio) {
      right.appendChild(el("span", "cosa-precio",
        pesos(c.precio * (parseInt(c.cantidad, 10) || 0))));
    }
    row.appendChild(right);
    return row;
  }

  /* ---------- alta rápida ---------- */
  (function () {
    var sel = $("cosaEstado");
    ESTADOS_COSA.forEach(function (e) { sel.appendChild(new Option(e.n, e.k)); });
    sel.value = "tengo";
  })();

  $("cosaForm").onsubmit = async function (ev) {
    ev.preventDefault();
    var nombre = $("cosaNombre").value.trim();
    if (!nombre) return;
    leeCtxCosas();
    var row = {
      id: uuid(),
      nombre: nombre,
      cantidad: Math.max(1, parseInt($("cosaCant").value, 10) || 1),
      categoria: S.ctxCosas.categoria || "",
      ubicacion: ubicacionActual(),
      destino: S.ctxCosas.destino || "",
      estado: $("cosaEstado").value,
      precio: null,
      notas: "",
      bulto_id: null,
      creado_en: new Date().toISOString()
    };
    $("cosaNombre").value = "";
    $("cosaCant").value = "1";
    await guardarCosa(row, "✓ " + nombre);
    $("cosaNombre").focus();
  };

  /* ---------- editar una cosa ---------- */
  function abreFormCosa(c) {
    abreModal(c.nombre || "Cosa", function (body, foot, cerrar) {
      function campo(t, ctrl, hint) {
        var l = el("label", "fl"); l.appendChild(el("span", null, t)); l.appendChild(ctrl);
        if (hint) l.appendChild(el("span", "hint", hint));
        return l;
      }
      var inN = el("input"); inN.type = "text"; inN.value = c.nombre || "";
      var inC = el("input"); inC.type = "number"; inC.min = "0"; inC.step = "1";
      inC.value = String(c.cantidad);
      var selE = el("select");
      ESTADOS_COSA.forEach(function (e) { selE.appendChild(new Option(e.n, e.k)); });
      selE.value = c.estado;

      var inCat = el("input"); inCat.type = "text"; inCat.value = c.categoria || "";
      inCat.setAttribute("list", "dlCats");
      inCat.placeholder = "Electrónica, Cocina, Blancos…";
      var dl = el("datalist"); dl.id = "dlCats";
      categorias().forEach(function (x) { dl.appendChild(new Option(x)); });

      var inU = el("input"); inU.type = "text"; inU.value = c.ubicacion || "";
      inU.setAttribute("list", "dlUbis");
      inU.placeholder = "Departamento · Sala";
      var dlu = el("datalist"); dlu.id = "dlUbis";
      ubicaciones().forEach(function (u) { dlu.appendChild(new Option(u)); });

      var selD = el("select");
      selD.appendChild(new Option("— sin asignar —", ""));
      destinos().forEach(function (d) { selD.appendChild(new Option(d, d)); });
      selD.value = c.destino || "";

      var inP = el("input"); inP.type = "number"; inP.min = "0"; inP.step = "1";
      inP.value = c.precio != null ? String(c.precio) : "";
      inP.placeholder = "opcional";

      var selB = el("select");
      selB.appendChild(new Option("— no está en ningún bulto —", ""));
      ordenados().forEach(function (b) {
        selB.appendChild(new Option(b.code + " · " + (b.destino || "sin asignar"), b.id));
      });
      selB.value = c.bulto_id || "";

      var taN = el("textarea"); taN.value = c.notas || ""; taN.style.minHeight = "56px";

      body.appendChild(campo("Qué es", inN));
      var f1 = el("div", "f2");
      f1.appendChild(campo("Cuántos", inC));
      f1.appendChild(campo("Estado", selE));
      body.appendChild(f1);
      var f2 = el("div", "f2");
      f2.appendChild(campo("Categoría", inCat));
      f2.appendChild(campo("Precio por unidad", inP, "Sólo si quieres presupuestar."));
      body.appendChild(f2);
      body.appendChild(dl);
      body.appendChild(campo("Dónde está ahora", inU, "Dónde lo tienes hoy, antes de mover nada."));
      body.appendChild(dlu);
      body.appendChild(campo("Va en (casa nueva)", selD));
      body.appendChild(campo("¿En qué bulto viaja?", selB, "Para encontrarlo después."));
      body.appendChild(campo("Notas", taN));

      var save = el("button", "btn btn-p", "Guardar");
      save.onclick = async function () {
        save.disabled = true;
        await guardarCosa(Object.assign({}, c, {
          nombre: inN.value.trim(),
          cantidad: Math.max(0, parseInt(inC.value, 10) || 0),
          estado: selE.value,
          categoria: inCat.value.trim(),
          ubicacion: inU.value.trim(),
          destino: selD.value,
          precio: inP.value === "" ? null : Number(inP.value),
          bulto_id: selB.value || null,
          notas: taN.value.trim()
        }), "Guardado");
        cerrar();
      };
      foot.appendChild(save);
      var del = el("button", "btn btn-danger", "Eliminar"); del.style.marginLeft = "auto";
      del.onclick = function () {
        if (!confirm("¿Eliminar “" + (c.nombre || "") + "” del inventario?")) return;
        borrarCosa(c.id); cerrar();
      };
      foot.appendChild(del);
    });
  }

  /* ---------- armar una caja desde la lista ---------- */

  function elegidas() {
    return S.cosas.filter(function (c) { return S.seleccion[c.id]; });
  }
  function pintaSelBar() {
    var n = elegidas().length;
    var bar = $("selBar");
    bar.hidden = (n === 0 || S.tab !== "cosas");
    if (n) $("selCount").textContent = n + (n === 1 ? " seleccionada" : " seleccionadas");
  }
  $("selClear").onclick = function () { S.seleccion = {}; render(); };
  $("selToBox").onclick = function () { abreMandarACaja(); };

  function renglonDeCosa(c) {
    var n = parseInt(c.cantidad, 10) || 0;
    return (n > 1 ? n + " × " : "") + (c.nombre || "");
  }

  function abreMandarACaja() {
    var cosas = elegidas();
    if (!cosas.length) return;

    abreModal("Mandar " + cosas.length + (cosas.length === 1 ? " cosa" : " cosas") + " a una caja",
      function (body, foot, cerrar) {
      function campo(t, ctrl, hint) {
        var l = el("label", "fl"); l.appendChild(el("span", null, t)); l.appendChild(ctrl);
        if (hint) l.appendChild(el("span", "hint", hint));
        return l;
      }

      // qué se va a meter
      var lista = el("ul", "contents");
      cosas.forEach(function (c) { lista.appendChild(el("li", null, renglonDeCosa(c))); });
      var cont = el("div"); cont.style.display = "grid"; cont.style.gap = "5px";
      cont.appendChild(el("span", "hint", "Va a quedar adentro:"));
      cont.appendChild(lista);
      body.appendChild(cont);

      // nueva o existente
      var modo = "nueva";
      var seg = el("div", "seg");
      var bNueva = el("button", null, "Caja nueva");
      var bExist = el("button", null, "Caja que ya existe");
      bNueva.type = "button"; bExist.type = "button";
      seg.appendChild(bNueva); seg.appendChild(bExist);
      body.appendChild(seg);

      // --- caja nueva ---
      var boxNueva = el("div"); boxNueva.style.display = "grid"; boxNueva.style.gap = "13px";

      var claveIni = S.ctx.clave || (S.config.origenes[0] || {}).clave || "BLT";
      S.config.origenes.forEach(function (o) {
        if (o.nombre === S.ctxCosas.origen) claveIni = o.clave;
      });
      var claveSel = claveIni;

      var codeView = el("div", "cap-code");
      codeView.appendChild(el("span", "cap-code-k", "Escribe en la caja"));
      var codeVal = el("span", "cap-code-v", siguienteCodigo(claveSel));
      codeVal.style.fontSize = "30px";
      codeView.appendChild(codeVal);
      boxNueva.appendChild(codeView);

      var segO = el("div", "seg");
      S.config.origenes.forEach(function (o) {
        var b = el("button", null, o.nombre);
        b.type = "button";
        b.setAttribute("aria-pressed", claveSel === o.clave ? "true" : "false");
        b.onclick = function () {
          claveSel = o.clave;
          codeVal.textContent = siguienteCodigo(claveSel);
          [].forEach.call(segO.children, function (x) {
            x.setAttribute("aria-pressed", x.textContent === o.nombre ? "true" : "false");
          });
        };
        segO.appendChild(b);
      });
      boxNueva.appendChild(campo("Viene de", segO));

      var selDest = el("select");
      selDest.appendChild(new Option("— elegir cuarto —", ""));
      destinos().forEach(function (d) { selDest.appendChild(new Option(d, d)); });
      // sugiere el destino que más se repite entre lo seleccionado
      var votos = {};
      cosas.forEach(function (c) { if (c.destino) votos[c.destino] = (votos[c.destino] || 0) + 1; });
      var mejor = "";
      Object.keys(votos).forEach(function (d) { if (!mejor || votos[d] > votos[mejor]) mejor = d; });
      selDest.value = mejor || S.ctxCosas.destino || S.ctx.destino || "";
      boxNueva.appendChild(campo("Va en (casa nueva)", selDest));

      var inLugar = el("input"); inLugar.type = "text";
      inLugar.placeholder = "Alacena, repisa de arriba";
      boxNueva.appendChild(campo("Dónde se guarda", inLugar));

      var segT = el("div", "seg");
      var trasSel = S.ctx.traslado || "mudanzera";
      TRASLADOS.forEach(function (t) {
        var b = el("button", null, t.n);
        b.type = "button";
        b.setAttribute("aria-pressed", trasSel === t.k ? "true" : "false");
        b.onclick = function () {
          trasSel = t.k;
          [].forEach.call(segT.children, function (x) {
            x.setAttribute("aria-pressed", x.textContent === t.n ? "true" : "false");
          });
        };
        segT.appendChild(b);
      });
      boxNueva.appendChild(campo("Quién lo traslada", segT));

      var chkF = document.createElement("input"); chkF.type = "checkbox";
      var lF = el("label", "chk"); lF.appendChild(chkF); lF.appendChild(document.createTextNode("Frágil"));
      boxNueva.appendChild(lF);

      // --- caja existente ---
      var boxExist = el("div"); boxExist.hidden = true;
      // la más reciente primero: normalmente es la que estás llenando
      var selBulto = el("select");
      S.bultos.slice().sort(function (a, b) {
        return String(b.creado_en || "").localeCompare(String(a.creado_en || ""));
      }).forEach(function (b) {
        selBulto.appendChild(new Option(b.code + " · " + (b.destino || "sin asignar"), b.id));
      });
      if (!ordenados().length) {
        selBulto.appendChild(new Option("todavía no hay cajas", ""));
        selBulto.disabled = true;
      }
      boxExist.appendChild(campo("¿A cuál?", selBulto,
        "Lo seleccionado se agrega al contenido de esa caja."));

      body.appendChild(boxNueva);
      body.appendChild(boxExist);

      function pintaModo() {
        bNueva.setAttribute("aria-pressed", modo === "nueva" ? "true" : "false");
        bExist.setAttribute("aria-pressed", modo === "existente" ? "true" : "false");
        boxNueva.hidden = modo !== "nueva";
        boxExist.hidden = modo !== "existente";
      }
      bNueva.onclick = function () { modo = "nueva"; pintaModo(); };
      bExist.onclick = function () { modo = "existente"; pintaModo(); };
      pintaModo();

      var ok = el("button", "btn btn-p", "Meter a la caja");
      ok.onclick = async function () {
        ok.disabled = true; ok.textContent = "Guardando…";
        try {
          var destinoCaja, bulto;

          if (modo === "nueva") {
            var origenNombre = nombreOrigen(claveSel);
            bulto = {
              id: uuid(),
              code: siguienteCodigo(claveSel),
              clave: claveSel,
              origen: origenNombre,
              cuarto_origen: S.ctxCosas.cuarto || "",
              tipo: "caja",
              estado: "empacado",
              destino: selDest.value,
              lugar: inLugar.value.trim(),
              traslado: trasSel,
              contenido: cosas.map(renglonDeCosa),
              notas: "",
              fotos: [],
              fragil: chkF.checked,
              abrir_primero: false,
              creado_en: new Date().toISOString()
            };
            await guardar(bulto);
          } else {
            var destino = bultoPorId(selBulto.value);
            if (!destino) { toast("Elige una caja."); ok.disabled = false; ok.textContent = "Meter a la caja"; return; }
            bulto = Object.assign({}, destino, {
              contenido: (destino.contenido || []).concat(cosas.map(renglonDeCosa))
            });
            await guardar(bulto);
          }
          destinoCaja = bulto.destino;

          for (var i = 0; i < cosas.length; i++) {
            await guardarCosa(Object.assign({}, cosas[i], {
              bulto_id: bulto.id,
              destino: cosas[i].destino || destinoCaja || ""
            }));
          }

          S.seleccion = {};
          cerrar();
          toast(cosas.length + (cosas.length === 1 ? " cosa" : " cosas") + " → " + bulto.code);
          render();
        } catch (e) {
          ok.disabled = false; ok.textContent = "Meter a la caja";
          toast(mensajeDeError(e));
        }
      };
      foot.appendChild(ok);
      var no = el("button", "btn", "Cancelar"); no.onclick = cerrar; foot.appendChild(no);
    });
  }

  /* ---------- exportar Mis cosas ---------- */

  function cosasParaExportar() { return cosasOrdenadas().filter(coincideCosa); }

  function descripcionFiltros() {
    var F = S.filtrosCosas, p = [];
    var est = Object.keys(F.estados);
    if (est.length) p.push(est.map(function (k) { return estadoCosa(k).n; }).join(" / "));
    if (F.categoria) p.push(F.categoria);
    if (F.ubicacion) p.push(F.ubicacion);
    if (F.q) p.push("“" + F.q + "”");
    return p.length ? p.join(" · ") : "todo el inventario";
  }

  $("cosasExcel").onclick = function () {
    var list = cosasParaExportar();
    if (!list.length) { toast("No hay nada que exportar con esos filtros."); return; }
    var cab = ["Cantidad", "Qué es", "Categoría", "Dónde está", "Va en", "Bulto",
      "Estado", "Precio unitario", "Total", "Notas"];
    var filas = list.map(function (c) {
      var b = c.bulto_id ? bultoPorId(c.bulto_id) : null;
      var n = parseInt(c.cantidad, 10) || 0;
      return [csvq(n), csvq(c.nombre), csvq(c.categoria), csvq(c.ubicacion),
        csvq(c.destino), csvq(b ? b.code : ""), csvq(estadoCosa(c.estado).n),
        csvq(c.precio == null ? "" : c.precio),
        csvq(c.precio == null ? "" : c.precio * n), csvq(c.notas)].join(",");
    });
    bajaCSV("mis-cosas", cab, filas);
    toast(list.length + " renglones exportados");
  };

  $("cosasPdf").onclick = function () {
    var list = cosasParaExportar();
    if (!list.length) { toast("No hay nada que imprimir con esos filtros."); return; }

    var host = $("printArea"); clear(host);
    host.appendChild(el("h1", null, "Mis cosas — Casa Jacarandas"));
    var unidades = list.reduce(function (a, c) { return a + (parseInt(c.cantidad, 10) || 0); }, 0);
    host.appendChild(el("div", "sub",
      descripcionFiltros() + " · " + list.length + " renglones · " + unidades + " artículos · " +
      new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })));

    var t = el("table");
    var th = el("thead"), trh = el("tr");
    ["Cant.", "Qué es", "Categoría", "Dónde está", "Va en", "Bulto", "Estado", "Total"]
      .forEach(function (h, i) {
        var c = el("th", (i === 0 || i === 7) ? "num" : null, h);
        trh.appendChild(c);
      });
    th.appendChild(trh); t.appendChild(th);

    var tb = el("tbody"), suma = 0;
    list.forEach(function (c) {
      var b = c.bulto_id ? bultoPorId(c.bulto_id) : null;
      var n = parseInt(c.cantidad, 10) || 0;
      var tot = c.precio ? c.precio * n : 0;
      suma += tot;
      var tr = el("tr");
      tr.appendChild(el("td", "num", String(n)));
      tr.appendChild(el("td", null, c.nombre || ""));
      tr.appendChild(el("td", null, c.categoria || ""));
      tr.appendChild(el("td", null, c.ubicacion || ""));
      tr.appendChild(el("td", null, c.destino || ""));
      tr.appendChild(el("td", null, b ? b.code : ""));
      tr.appendChild(el("td", null, estadoCosa(c.estado).n));
      tr.appendChild(el("td", "num", tot ? pesos(tot) : ""));
      tb.appendChild(tr);
    });
    t.appendChild(tb);

    if (suma > 0) {
      var tf = el("tfoot"), trf = el("tr");
      var td = el("td", null, "Suma de lo que tiene precio");
      td.colSpan = 7;
      trf.appendChild(td);
      trf.appendChild(el("td", "num", pesos(suma)));
      tf.appendChild(trf); t.appendChild(tf);
    }
    host.appendChild(t);

    document.body.setAttribute("data-print", "cosas");
    setTimeout(function () {
      window.print();
      setTimeout(function () { document.body.removeAttribute("data-print"); }, 400);
    }, 60);
  };

  var qtc = null;
  $("qCosas").oninput = function () {
    clearTimeout(qtc); var v = $("qCosas").value;
    qtc = setTimeout(function () { S.filtrosCosas.q = v.trim(); render(); }, 140);
  };

  /* =====================================================
     NAVEGACIÓN Y RENDER
     ===================================================== */

  function setTab(t) {
    S.tab = t;
    ["capturar", "bultos", "cosas", "resumen", "etiquetas"].forEach(function (k) {
      $("view" + k.charAt(0).toUpperCase() + k.slice(1)).hidden = (k !== t);
    });
    document.querySelectorAll(".tab,.bn").forEach(function (b) {
      b.setAttribute("aria-selected", b.getAttribute("data-tab") === t ? "true" : "false");
    });
    window.scrollTo(0, 0);
  }
  document.querySelectorAll(".tab,.bn").forEach(function (b) {
    b.onclick = function () { setTab(b.getAttribute("data-tab")); render(); };
  });

  function render() {
    // medidor
    var bar = $("meterBar"); clear(bar);
    var counts = {}; ESTADOS.forEach(function (e) { counts[e.k] = 0; });
    S.bultos.forEach(function (b) { if (counts[b.estado] != null) counts[b.estado]++; });
    var total = S.bultos.length;
    ESTADOS.forEach(function (e) {
      if (!counts[e.k]) return;
      var i = el("i");
      i.style.width = (counts[e.k] / Math.max(total, 1) * 100) + "%";
      i.style.background = colVar(e.c); i.title = e.n + ": " + counts[e.k];
      bar.appendChild(i);
    });
    $("meterNum").textContent = counts.desempacado + " / " + total;

    if (S.tab === "capturar") pintaCaptura();
    if (S.tab === "bultos") { pintaFiltros(counts); pintaToggleFiltros(); pintaGrid(); }
    if (S.tab === "cosas") pintaCosas();
    pintaSelBar();
    if (S.tab === "resumen") pintaResumen();
    if (S.tab === "etiquetas") pintaEtiquetas();
    pintaRed();
  }

  /* filtros */
  var filtrosAbiertos = window.matchMedia("(min-width:761px)").matches;
  function filtrosActivos() {
    var F = S.filtros;
    return Object.keys(F.estados).length + Object.keys(F.origenes).length +
      (F.destino ? 1 : 0) + (F.traslado ? 1 : 0) + (F.frag ? 1 : 0) + (F.first ? 1 : 0);
  }
  function pintaToggleFiltros() {
    $("filtrosMas").hidden = !filtrosAbiertos;
    $("btnFiltros").setAttribute("aria-expanded", filtrosAbiertos ? "true" : "false");
    var n = filtrosActivos();
    $("btnFiltros").textContent = n ? "Filtros · " + n : "Filtros";
  }
  $("btnFiltros").onclick = function () { filtrosAbiertos = !filtrosAbiertos; pintaToggleFiltros(); };

  $("btnClear").onclick = function () {
    S.filtros = { q: "", estados: {}, origenes: {}, destino: "", frag: false, first: false, traslado: "" };
    $("q").value = ""; render();
  };
  $("chipFrag").onclick = function () { S.filtros.frag = !S.filtros.frag; render(); };
  $("chipFirst").onclick = function () { S.filtros.first = !S.filtros.first; render(); };
  var qt = null;
  $("q").oninput = function () {
    clearTimeout(qt); var v = $("q").value;
    qt = setTimeout(function () { S.filtros.q = v.trim(); render(); }, 140);
  };
  $("btnPrint").onclick = function () { window.print(); };

  /* red */
  $("netBadge").onclick = async function () {
    if (!cuantasPendientes()) return;
    toast("Reintentando…");
    await reintentaPendientes();
    toast(cuantasPendientes() ? cuantasPendientes() + " siguen sin guardar" : "Todo quedó guardado");
    render();
  };
  window.addEventListener("online", function () {
    pintaRed(); vaciarCola(); vaciarFotos(); reintentaPendientes(); recargar();
  });
  window.addEventListener("offline", pintaRed);
  setInterval(function () {
    if (queue().length) vaciarCola();
    if (fotosPend) vaciarFotos();
    if (cuantasPendientes()) reintentaPendientes();
  }, 20000);

  /* =====================================================
     ARRANQUE
     ===================================================== */

  (async function init() {
    var cfg = window.MUDANZA_CONFIG || {};
    if (!cfg.url || cfg.url.indexOf("PEGA-AQUI") >= 0) {
      $("bootMsg").textContent = "Falta configurar config.js con la URL y la llave de Supabase. Lee el README.";
      return;
    }
    sb = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true }
    });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }

    var s = (await sb.auth.getSession()).data.session;
    if (s) await arrancarApp();
    else mostrarLogin();
  })();

})();

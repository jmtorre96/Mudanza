# Bitácora de mudanza — qué falta para ponerla a andar

Estado actual:

- ✅ Proyecto de Supabase creado (`pzwsaujuyykcrnuxuslk`)
- ✅ `config.js` ya tiene tu URL y tu llave — **no hay que editarlo**
- ⬜ Paso A — correr el SQL (5 min)
- ⬜ Paso B — apagar la confirmación por correo (1 min)
- ⬜ Paso C — publicar en GitHub Pages (5 min)
- ⬜ Paso D — entrar e instalarla en el celular (3 min)

---

## Paso A — La base de datos · 3 min

1. Abre **`sql-TODO-EN-UNO.sql`** con el Bloc de notas.
2. En la sección 4, borra de la lista de cuartos los que no existan en tu casa.
3. Supabase → **SQL Editor** → **New query** → pega **el contenido completo del
   archivo** (no el nombre) → **Run**.
4. Al final te imprime una tabla de comprobación. Revísala: los correos con
   acceso tienen que ser exactamente con los que entran a la app.

Es seguro correrlo las veces que quieras: no duplica ni borra nada que ya exista.

---

## Paso B — Que no pida confirmar el correo · 1 min

Menú izquierdo → **Authentication** → **Sign In / Providers** → **Email** →
apaga **Confirm email** → *Save*.

Sin esto, al crear tu contraseña te va a pedir revisar tu bandeja, y el correo
gratuito de Supabase a veces tarda o no llega.

---

## Paso C — Publicar la app en GitHub Pages · 5 min

1. Entra a **github.com** → botón **+** (arriba a la derecha) → **New repository**
   - Repository name: `mudanza`
   - **Public** ← tiene que ser público; GitHub Pages gratis sólo publica
     repos públicos. Es seguro (ver la nota de abajo).
   - **NO** marques *Add a README file*.
   - **Create repository**

2. En la pantalla que aparece, haz clic en el enlace
   **“uploading an existing file”**.

3. Abre esta carpeta (`Mudanza\app`) en el Explorador, **selecciona todos los
   archivos** (Ctrl+A) y **arrástralos** a la ventana de GitHub.
   ⚠️ Arrastra **los archivos**, no la carpeta.

4. Abajo, botón verde **Commit changes**.

5. Pestaña **Settings** (arriba) → en la columna izquierda **Pages** →
   - *Source*: **Deploy from a branch**
   - *Branch*: **main** y carpeta **/ (root)** → **Save**

6. Espera 1 o 2 minutos y recarga. Arriba te aparece tu dirección:
   **`https://TU-USUARIO.github.io/mudanza/`**
   Ésa es la app. Guárdala.

> **¿Por qué es seguro que el repo sea público?**
> Lo único que queda a la vista es la llave `anon`, que sólo sirve para tocar la
> puerta. Quién pasa lo decide la base de datos: sólo los correos de la tabla
> `permitidos`. Un extraño puede ver el código, pero no tus cajas ni tus fotos.
> Aun así, haz el **candado extra** de abajo cuando ya estén los dos dentro.

---

## Paso D — Entrar e instalarla · 3 min

1. Abre tu dirección en el celular.
2. Toca **“Es mi primera vez — crear mi contraseña”**, escribe
   **jmtorre@principado.com.mx** y una contraseña de 6+ caracteres.
3. Instálala en la pantalla de inicio:
   - **Android / Chrome:** menú ⋮ → *Instalar aplicación*
   - **iPhone / Safari:** botón Compartir → *Agregar a inicio*
4. Pásale la dirección a tu esposa; ella hace lo mismo con **su** correo.

### 🔒 Candado extra (hazlo cuando los dos ya entraron)

Supabase → **Authentication** → **Sign In / Providers** → **Email** → apaga
**Allow new users to sign up** → *Save*.

Así ya nadie más puede siquiera crear una cuenta. Si después necesitas dar de
alta a alguien, lo vuelves a prender un minuto.

---

## Cómo capturar rápido (para 100+ bultos)

La pantalla **Capturar** está hecha para que sólo escribas lo que cambia:

1. Arriba, toca **Cambiar** y fija el contexto una vez: *estoy empacando en
   Departamento · Cocina → va en Cocina*. Eso se queda pegado.
2. Empaca la caja y, antes de cerrarla, toca **📷 Foto**.
3. Escribe (o dicta con 🎤) una nota breve:
   `los platos de la vajilla de la abuela, con cuidado`
4. **Guardar y siguiente** → te muestra el número (`DEP-047`); lo marcas con
   plumón en la caja y sigues. El contexto no se pierde.

**No todo va en caja.** Arriba de todo hay cuatro botones: **Caja**, **Mueble**,
**Aparato** y **Suelto**. Tócalos y la pantalla cambia sola: para un colchón te
pregunta *"¿qué mueble es?"* y en vez de *"escribe en la caja"* dice *"pégale
esta etiqueta"*. El colchón, la lavadora y el congelador se registran igual que
una caja — con su número, su cuarto destino y su foto — sólo que la etiqueta se
pega con cinta en vez de escribirse con plumón.

Atajos que ahorran tiempo de verdad:

- **Pegar una lista** — un renglón por caja, crea todas de golpe.
- **Duplicar** (dentro de *Editar*) — para cajas iguales: 6 de libros, 4 de ropa.
- **Ctrl + Enter** guarda sin soltar el teclado, en la compu.
- **Deshacer último** si te equivocaste en la que acabas de guardar.

Marca **Abrir primero** en 5 o 6 cajas (sábanas, toallas, medicinas,
cargadores, papel de baño, cafetera).

### Descargar la lista

Tanto **Bultos** como **Mis cosas** tienen abajo de los filtros dos botones:

- **⤓ Excel** — baja un CSV que abre directo en Excel.
- **⎙ PDF** — arma una tabla limpia y abre el diálogo de impresión; ahí eliges
  *Guardar como PDF*.

Los dos **respetan los filtros que tengas puestos**. Filtra "Falta comprar" y
dale PDF: ésa es tu lista para la tienda. Filtra por "Cocina" y dale Excel: ésa
es la relación de esa habitación para la mudanzera.

### Quién lo traslada

En *Cambiar* eliges si el bulto se lo lleva la **mudanzera** o **lo llevas tú**.
Se queda pegado igual que el cuarto, así que capturas de corrido las cajas que
van contigo. Un bulto marcado "lo llevo yo" sale con etiqueta azul en la lista y
su etiqueta impresa dice **NO SUBIR AL CAMIÓN**, para que nadie lo cargue por
error. En *Resumen* tienes el conteo de cada uno — útil para pedir cotización.

### Mis cosas

Es un inventario aparte de los bultos: **qué tengo y cuánto**, no en qué caja va.
Sirve para dos cosas — saber que son cuatro amplificadores y no tres, y sacar la
lista de lo que falta comprar.

- Arriba de todo hay una barra **"Estoy en"**: fijas una vez dónde estás
  (Departamento · Sala) y a dónde va eso en la casa nueva. Se queda pegada, así
  que recorres un cuarto anotando sin repetir la ubicación en cada renglón.
- Luego escribes qué es, cuántos, y si **ya lo tienes**, **falta comprarlo** o
  está **por decidir**.
- En la lista, los botones **−** y **+** ajustan la cantidad sin abrir nada.
- Al tocar un renglón puedes ponerle categoría, cuarto destino, notas, precio
  por unidad y **en qué bulto viaja** (así lo encuentras después).
- El precio es opcional; si lo pones, arriba te suma cuánto cuesta lo que falta.
- Filtra por **Falta comprar** y ya tienes tu lista para la tienda; o por
  **Dónde está** / **Categoría** para ver todo lo de un cuarto o de un tipo.

### Armar cajas desde la lista

Cada renglón tiene una casilla a la izquierda. Palomea varias cosas y abajo
aparece una barra: **Mandar a una caja**.

- **Caja nueva** — te muestra el número que le toca, y ya trae sugerido el
  cuarto destino más repetido entre lo que elegiste. Le pones dónde se guarda,
  quién la traslada, y listo: la caja se crea con esas cosas como contenido.
- **Caja que ya existe** — se agregan al contenido de la que elijas. La lista
  muestra primero la más reciente, que normalmente es la que estás llenando.

En los dos casos, cada cosa queda ligada a su caja: en Mis cosas vas a ver su
número (`DEP-012`) y así sabes dónde quedó sin abrir nada.

### Sobre las fotos

- Se reducen en el celular antes de subirse (~150 KB en vez de 4 MB), así que
  no te comes los datos ni el espacio gratis.
- Se guardan en un almacén **privado**: sólo se ven desde la app, con una liga
  temporal. No son públicas.
- Si no hay señal, la foto se queda guardada en el celular y **se sube sola**
  cuando vuelve el internet. Arriba te dice cuántas faltan.
- Para verlas **sí necesitas señal** (por eso no se guardan en el teléfono).

---

## Cosas que vas a necesitar después

**Agregar a alguien más**
Supabase → *Table Editor* → tabla `permitidos` → *Insert row* → su correo.
(Si pusiste el candado extra, préndelo mientras esa persona crea su contraseña.)

**Cambiar los cuartos de la casa o los orígenes**
Dentro de la app: botón **Ajustes**.

**Respaldo**
Dentro de la app: **Ajustes** → *Respaldo de bultos* y *Respaldo de mis cosas*.
Los dos bajan en CSV y abren en Excel.
Hazlo una vez a la semana y el día antes de la mudanza.

**Actualizar la app**
Edita los archivos de esta carpeta, sube el número de `VERSION` en `sw.js`
(`mudanza-v1` → `mudanza-v2`), y en GitHub arrastra los archivos cambiados
(*Add file* → *Upload files* → *Commit*). Tarda 1–2 minutos en salir, y en el
celular a veces hay que cerrar y abrir la app dos veces.

---

## Si algo falla

| Lo que ves | Qué pasa |
|---|---|
| *“Tu correo no está en la lista de acceso”* | Ese correo no quedó en `permitidos`, o está escrito distinto. Revísalo en *Table Editor*. |
| *“Correo o contraseña incorrectos”* | Usa *“Es mi primera vez”* si todavía no creabas contraseña. |
| Pide confirmar por correo | Faltó el **Paso B**. |
| La página sale en blanco o 404 | GitHub Pages tarda 1–2 min la primera vez. Y revisa que arrastraste los **archivos**, no la carpeta: `index.html` tiene que estar en la raíz del repo. |
| Las fotos no se ven | Sin señal no se ven (es un almacén privado). Si con señal tampoco, revisa la nota del Paso A sobre el bucket `fotos`. |
| Los cambios no le llegan al otro | Supabase → *Database* → *Publications* → `supabase_realtime` debe incluir `bultos`. |

> **Ojo con el plan gratis de Supabase:** si nadie abre la app durante ~7 días,
> el proyecto se pausa. Se reactiva con un clic desde el panel, sin perder
> datos. Durante la mudanza la vas a usar a diario, así que no debería pasar.

---

## Qué hay en esta carpeta

| Archivo | Para qué |
|---|---|
| `index.html`, `styles.css`, `app.js` | La app. |
| `config.js` | Tus claves de Supabase. Ya está listo. |
| `sql-TODO-EN-UNO.sql` | Toda la base de datos en un solo archivo (Paso A). |
| `sw.js`, `manifest.webmanifest`, `icon-*` | Lo que la hace instalable y usable sin internet. |
| `.nojekyll` | Le dice a GitHub Pages que publique tal cual. No lo borres. |

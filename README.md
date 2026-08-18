# Sandra's Confort — Página de masajes

Sitio hecho en HTML + CSS + JS puro (sin frameworks), con:
- **Firebase Firestore** como base de datos (reservas, disponibilidad de horarios y reseñas).
- **EmailJS** para mandar un email automático cuando alguien reserva o deja una reseña.

## Archivos

- `index.html` — estructura de la página.
- `style.css` — estilos (colores, tipografía, layout).
- `script.js` — toda la lógica: acá está la sección de **CONFIGURACIÓN** al principio del archivo con todo lo que probablemente quieras editar (datos del negocio, servicios, horarios).
- `README.md` — esta guía.

---

## 1) Antes de nada: cómo probarlo

Como `script.js` se carga como **módulo** (`type="module"`), **no podés abrir `index.html` haciendo doble clic**: el navegador bloquea los `import` por seguridad (CORS) cuando el archivo se abre con `file://`.

Opciones simples para probarlo local:
- VS Code con la extensión **Live Server** (clic derecho en `index.html` → "Open with Live Server").
- O desde una terminal, parado en la carpeta del proyecto: `npx serve` (necesita Node instalado) y abrís la URL que te muestra.

Una vez que lo subas a Firebase Hosting, Netlify, etc., esto deja de ser un problema (ya no es `file://`).

---

## 2) Configurar Firestore (la base de datos)

### a) Crear la base
En Firebase Console → tu proyecto (`sandrasconfort`) → **Firestore Database** → crear base de datos (modo producción).

### b) Pegar las reglas de seguridad
Andá a **Firestore Database → Reglas** y reemplazá todo por esto:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Reservas: datos privados de los clientes.
    // Cualquiera puede CREAR una reserva (enviar el formulario),
    // pero nadie puede leer, editar ni borrar desde el navegador.
    match /reservas/{reservaId} {
      allow create: if true;
      allow read, update, delete: if false;
    }

    // Horarios ocupados: solo fecha y hora, SIN datos personales.
    // Se usa para saber qué horarios ya están tomados.
    match /horarios-ocupados/{docId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if false;
    }

    // Reseñas: son públicas por diseño (se muestran en la página).
    match /resenas/{resenaId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if false;
    }
  }
}
```

**Por qué importa esto:** el `apiKey` y demás datos de `firebaseConfig` en `script.js` están pensados para ser públicos (así funciona Firebase). La seguridad real la dan estas reglas, no el hecho de "esconder" la config. Sin estas reglas pegadas, Firestore puede estar bloqueando todo por defecto y el formulario va a fallar.

Para ver las reservas que van llegando, andá a Firestore Database → pestaña **Datos**, colección `reservas` (ahí sí las ves vos desde la consola, aunque el navegador de los clientes no pueda leerlas).

---

## 3) Configurar EmailJS

Ya usé los datos que me pasaste:
- Service ID: `service_6z8f9uo`
- Template ID: `template_s44yqxh`
- Public Key: `iEk9UF15MzakJwDQ2`

### Cómo funciona en este proyecto
- Cuando alguien **reserva**, se manda un email usando esa plantilla, con `email` = el email que la persona escribió en el formulario. **Para que la confirmación le llegue a ella y no a vos**, en EmailJS andá a tu plantilla → pestaña **Settings** → campo **To Email** → poné `{{email}}`.
- Cuando alguien deja una **reseña**, se usa la MISMA plantilla (por ahora), pero con `email` = tu propio email (`NEGOCIO.email` en `script.js`), para que el aviso te llegue a vos.

Esto funciona, pero el TEXTO de la plantilla va a ser el mismo para las dos cosas, lo cual puede quedar raro (una plantilla pensada para "confirmamos tu turno" no tiene mucho sentido como aviso de reseña). Por eso te dejo dos modelos de plantilla abajo.

### Variables que manda el código
Para reservas: `email`, `nombre`, `apellido`, `telefono`, `servicio`, `fecha`, `hora`, `comentario`, `mensaje` (este último ya viene todo armado en un solo bloque de texto, como respaldo).

Para reseñas: `email`, `nombre`, `calificacion`, `comentario`, `mensaje`.

### Modelo de plantilla sugerido — Reserva (para tu plantilla actual)
En EmailJS → tu plantilla → editá el contenido:

```
Asunto: Reserva confirmada - {{nombre}} {{apellido}}

Hola {{nombre}}, ¡tu turno quedó reservado!

Servicio: {{servicio}}
Fecha: {{fecha}}
Hora: {{hora}}
Teléfono: {{telefono}}
Comentario: {{comentario}}

Cualquier cambio, escribinos.
```

### Modelo sugerido — Reseña (para una plantilla nueva)
El plan gratuito de EmailJS permite **2 plantillas**, así que podés crear una segunda sin costo:

```
Asunto: Nueva reseña - {{nombre}} ({{calificacion}}/5)

Nueva reseña recibida:

Nombre: {{nombre}}
Calificación: {{calificacion}}/5
Comentario: {{comentario}}
```

Cuando la crees, copiá su ID (`template_xxxxxxx`) y reemplazalo en `script.js`, en la línea:

```js
const EMAILJS_TEMPLATE_RESENA = "template_s44yqxh"; // cambiar acá
```

---

## 4) Datos que tenés que reemplazar

Todo esto está junto, arriba de todo en `script.js`, en el objeto `NEGOCIO` y el array `SERVICIOS`:

- [ ] Nombre del negocio (asumí "Sandra's Confort" por el nombre del proyecto de Firebase — cambialo si no es así).
- [ ] Teléfono, WhatsApp, email, dirección, Instagram (están todos con datos de ejemplo).
- [ ] Servicios: nombres, duración, precios y descripciones son de ejemplo — quedan géneros/precios en pesos uruguayos ($) como referencia.
- [ ] Horario de atención y días cerrados (`HORARIO_CONFIG`), si no es lunes a sábado de 9 a 19.

---

## 5) Publicar la página

La forma más simple, ya que tenés el proyecto en Firebase, es **Firebase Hosting**:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # elegís el proyecto "sandrasconfort", carpeta pública = esta carpeta
firebase deploy
```

También funciona subiendo los 3 archivos a Netlify (arrastrando la carpeta) o GitHub Pages.

---

## 6) Ideas para más adelante (opcional)

- **Moderar reseñas** antes de que se publiquen: agregar un campo `aprobado: false` al guardar y filtrar la consulta por `aprobado == true` (vas a necesitar crear un índice compuesto en Firestore, te lo pide solo con un link la primera vez que corra esa consulta).
- **Analytics**: como ya tenés `measurementId` en tu config de Firebase, se puede sumar `firebase-analytics.js` para ver visitas.
- **Anti-spam más fuerte**: si el campo trampa no alcanza, Firebase App Check agrega una capa extra sin pedirle nada al usuario.
- **Paginación de reseñas**: hoy se muestran las últimas 9; se puede agregar un botón "ver más".

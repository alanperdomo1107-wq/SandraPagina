/* =========================================================
   SANDRA'S CONFORT — script.js
   Todo lo que necesitás editar está en la sección de
   CONFIGURACIÓN de acá abajo. El resto es lógica que no
   hace falta tocar salvo que quieras cambiar el comportamiento.
   ========================================================= */

// ============================================================
// 1) CONFIGURACIÓN DEL NEGOCIO — Editá estos datos
// ============================================================
const NEGOCIO = {
  nombre: "Sandra's Confort",
  telefono: "098277505",              // TODO: reemplazar por el real
  whatsapp: "59898277505",              // TODO: solo números, con código de país, sin +/espacios
  email: "alanperdomo1107@gmail.com", // TODO: acá te llegan los avisos de reseñas nuevas
  direccion: "San José de Mayo, Uruguay", // TODO: dirección real
  instagram: "https://instagram.com/alan.perdomoo",  // TODO: link real de Instagram
  horario: "Lunes a sábado, 9:00 a 19:00 hs",
};

// Servicios que se muestran en la sección "Servicios" y en el
// select del formulario de reservas. Agregá, sacá o editá los que quieras.
const SERVICIOS = [
  {
    id: "descontracturante",
    nombre: "Masaje Descontracturante",
    duracion: 50,
    precio: 1200,
    descripcion: "Para nudos que ya son parte del paisaje: espalda, cuello y hombros vuelven a moverse libres.",
  },
  {
    id: "relajante",
    nombre: "Masaje Relajante",
    duracion: 60,
    precio: 1300,
    descripcion: "Presión suave, ritmo lento. Pensado para bajar un cambio y no pensar en nada.",
  },
  {
    id: "piedras-calientes",
    nombre: "Piedras Calientes",
    duracion: 75,
    precio: 1800,
    descripcion: "El calor entra antes que las manos. Ideal para los días de más tensión acumulada.",
  },
  {
    id: "deportivo",
    nombre: "Masaje Deportivo",
    duracion: 50,
    precio: 1400,
    descripcion: "Trabajo más intenso en los músculos que más usás, antes o después de entrenar.",
  },
];

// Días y horarios de atención, usados para generar los horarios
// disponibles en el formulario de reservas.
const HORARIO_CONFIG = {
  diasCerrados: [0],     // 0 = domingo, 1 = lunes ... 6 = sábado
  horaInicio: 9,         // 9 = 9:00
  horaFin: 19,           // 19 = 19:00 (último turno posible: 18:30 con intervalo de 30)
  intervaloMinutos: 30,
};

// ============================================================
// 2) CONFIGURACIÓN DE FIREBASE
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyCylvCCIQvOvwcdQ7rsIQSDa23ipKLPCjY",
  authDomain: "sandrasconfort.firebaseapp.com",
  projectId: "sandrasconfort",
  storageBucket: "sandrasconfort.firebasestorage.app",
  messagingSenderId: "964790993963",
  appId: "1:964790993963:web:e9a6d30258f858e338966e",
};

// ============================================================
// 3) CONFIGURACIÓN DE EMAILJS
// ============================================================
const EMAILJS_PUBLIC_KEY = "iEk9UF15MzakJwDQ2";
const EMAILJS_SERVICE_ID = "service_6z8f9uo";
const EMAILJS_TEMPLATE_RESERVA = "template_s44yqxh";
// TODO (recomendado): creá una segunda plantilla en EmailJS pensada
// para reseñas y poné acá su ID. El plan gratis de EmailJS permite
// hasta 2 plantillas. Mientras tanto, usamos la misma para las dos cosas.
const EMAILJS_TEMPLATE_RESENA = "template_wi2acyo";

// ============================================================
// IMPORTS DE FIREBASE (SDK modular vía CDN, sin necesidad de npm)
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// EmailJS se carga como script clásico en index.html y queda
// disponible acá como variable global "emailjs".
emailjs.init({
  publicKey: EMAILJS_PUBLIC_KEY,
  limitRate: { id: "sandras-confort", throttle: 8000 }, // freno básico anti-spam
});

// ============================================================
// UTILIDADES
// ============================================================
function pad(n) {
  return String(n).padStart(2, "0");
}

function hoyISO() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`;
}

// Convierte "2026-08-20" en una fecha LOCAL (evita el corrimiento
// de un día que puede pasar si se interpreta como UTC).
function parsearFechaLocal(fechaStr) {
  const [y, m, d] = fechaStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatPrecio(n) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatearFecha(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") return "";
  return timestamp.toDate().toLocaleDateString("es-UY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function showStatus(el, mensaje, tipo) {
  el.textContent = mensaje;
  el.className = "form-status" + (tipo ? " is-" + tipo : "");
}

function setLoading(btn, loading, texto) {
  btn.disabled = loading;
  const span = btn.querySelector(".btn-text");
  if (loading) {
    btn.dataset.textoOriginal = btn.dataset.textoOriginal || span.textContent;
    span.textContent = texto || "Enviando...";
  } else {
    span.textContent = btn.dataset.textoOriginal || span.textContent;
  }
}

// ============================================================
// DATOS DEL NEGOCIO EN EL DOM (header, footer, título)
// ============================================================
function renderDatosNegocio() {
  document.title = `${NEGOCIO.nombre} · Masajes y bienestar`;
  document.querySelectorAll(".js-nombre-negocio").forEach((el) => {
    el.textContent = NEGOCIO.nombre;
  });

  const tel = document.getElementById("footer-tel");
  tel.textContent = NEGOCIO.telefono;
  tel.href = `tel:${NEGOCIO.telefono.replace(/\s+/g, "")}`;

  document.getElementById("footer-whatsapp").href = `https://wa.me/${NEGOCIO.whatsapp}`;
  document.getElementById("footer-instagram").href = NEGOCIO.instagram;
  document.getElementById("footer-horario").textContent = NEGOCIO.horario;
  document.getElementById("footer-direccion").textContent = NEGOCIO.direccion;
  document.getElementById("footer-year").textContent = new Date().getFullYear();
}

// ============================================================
// SERVICIOS: tarjetas + opciones del select de reserva
// ============================================================
function renderServicios() {
  const grid = document.getElementById("services-grid");
  grid.innerHTML = "";
  SERVICIOS.forEach((s) => {
    const card = document.createElement("article");
    card.className = "service-card";
    card.innerHTML = `
      <h3>${s.nombre}</h3>
      <p class="service-meta">${s.duracion} min · ${formatPrecio(s.precio)}</p>
      <p class="service-desc">${s.descripcion}</p>
    `;
    grid.appendChild(card);
  });

  const select = document.getElementById("r-servicio");
  SERVICIOS.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = `${s.nombre} — ${s.duracion} min — ${formatPrecio(s.precio)}`;
    select.appendChild(opt);
  });
}

// ============================================================
// HORARIOS DISPONIBLES
// ============================================================
function generarSlots() {
  const slots = [];
  let totalMin = HORARIO_CONFIG.horaInicio * 60;
  const finMin = HORARIO_CONFIG.horaFin * 60;
  while (totalMin < finMin) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    slots.push(`${pad(h)}:${pad(m)}`);
    totalMin += HORARIO_CONFIG.intervaloMinutos;
  }
  return slots;
}

function poblarSelectHoras(ocupadas) {
  const select = document.getElementById("r-hora");
  select.innerHTML = '<option value="" disabled selected>Elegí un horario</option>';
  generarSlots().forEach((hora) => {
    const opt = document.createElement("option");
    opt.value = hora;
    opt.disabled = ocupadas.has(hora);
    opt.textContent = ocupadas.has(hora) ? `${hora} (ocupado)` : hora;
    select.appendChild(opt);
  });
}

async function actualizarHorariosDisponibles(fecha) {
  const select = document.getElementById("r-hora");
  const statusEl = document.getElementById("reserva-status");
  if (!fecha) return;

  const fechaLocal = parsearFechaLocal(fecha);
  if (HORARIO_CONFIG.diasCerrados.includes(fechaLocal.getDay())) {
    select.innerHTML = '<option value="" disabled selected>Cerrado este día</option>';
    showStatus(statusEl, "Ese día no abrimos. Elegí otra fecha, por favor.", "error");
    return;
  }
  showStatus(statusEl, "", "");
  select.innerHTML = '<option value="" disabled selected>Buscando horarios…</option>';

  try {
    // Colección "horarios-ocupados": solo guarda fecha y hora, sin
    // datos personales, así puede leerse públicamente sin exponer
    // la info de los clientes (esa vive solo en "reservas").
    const q = query(collection(db, "horarios-ocupados"), where("fecha", "==", fecha));
    const snap = await getDocs(q);
    const ocupadas = new Set(snap.docs.map((d) => d.data().hora));
    poblarSelectHoras(ocupadas);
  } catch (err) {
    console.error("Error al consultar horarios ocupados:", err);
    poblarSelectHoras(new Set()); // si falla la consulta, mostramos todos los horarios igual
  }
}

// ============================================================
// RESERVAS: envío del formulario
// ============================================================
async function manejarSubmitReserva(e) {
  e.preventDefault();
  const form = e.target;
  const statusEl = document.getElementById("reserva-status");
  const btn = document.getElementById("reserva-submit");

  // Campo trampa: si un bot lo completó, ignoramos el envío en silencio.
  if (form.website.value) return;

  const datos = {
    nombre: form.nombre.value.trim(),
    apellido: form.apellido.value.trim(),
    telefono: form.telefono.value.trim(),
    email: form.email.value.trim(),
    servicio: form.servicio.value,
    fecha: form.fecha.value,
    hora: form.hora.value,
    comentario: form.comentario.value.trim(),
  };

  if (!datos.nombre || !datos.apellido || !datos.telefono || !datos.email || !datos.servicio || !datos.fecha || !datos.hora) {
    showStatus(statusEl, "Completá todos los campos obligatorios.", "error");
    return;
  }

  const fechaLocal = parsearFechaLocal(datos.fecha);
  if (HORARIO_CONFIG.diasCerrados.includes(fechaLocal.getDay())) {
    showStatus(statusEl, "Ese día no abrimos. Elegí otra fecha.", "error");
    return;
  }

  setLoading(btn, true, "Enviando...");
  showStatus(statusEl, "", "");

  try {
    // Chequeo de último momento: por si alguien reservó ese mismo
    // horario mientras esta persona completaba el formulario.
    const qDisp = query(
      collection(db, "horarios-ocupados"),
      where("fecha", "==", datos.fecha),
      where("hora", "==", datos.hora)
    );
    const snapDisp = await getDocs(qDisp);
    if (!snapDisp.empty) {
      showStatus(statusEl, "Justo se ocupó ese horario. Elegí otro, por favor.", "error");
      await actualizarHorariosDisponibles(datos.fecha);
      setLoading(btn, false);
      return;
    }

    // Guardamos en dos colecciones a la vez (atómico con writeBatch):
    // "reservas" = datos completos y privados del cliente.
    // "horarios-ocupados" = solo fecha/hora, para chequear disponibilidad.
    const batch = writeBatch(db);
    const reservaRef = doc(collection(db, "reservas"));
    batch.set(reservaRef, { ...datos, creadoEn: serverTimestamp(), estado: "pendiente" });
    const dispRef = doc(collection(db, "horarios-ocupados"));
    batch.set(dispRef, { fecha: datos.fecha, hora: datos.hora });
    await batch.commit();

    const servicioInfo = SERVICIOS.find((s) => s.id === datos.servicio);
    const nombreServicio = servicioInfo ? servicioInfo.nombre : datos.servicio;
    const mensaje =
      `Nueva reserva\n` +
      `Cliente: ${datos.nombre} ${datos.apellido}\n` +
      `Teléfono: ${datos.telefono}\n` +
      `Email: ${datos.email}\n` +
      `Servicio: ${nombreServicio}\n` +
      `Fecha: ${datos.fecha}\n` +
      `Hora: ${datos.hora}\n` +
      `Comentario: ${datos.comentario || "(sin comentario)"}`;

    // "email" acá es el del CLIENTE: si tu plantilla de EmailJS tiene
    // "To Email" = {{email}}, la confirmación le llega a quien reservó.
    let emailOk = true;
    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_RESERVA, {
        email: datos.email,
        nombre: datos.nombre,
        apellido: datos.apellido,
        telefono: datos.telefono,
        servicio: nombreServicio,
        fecha: datos.fecha,
        hora: datos.hora,
        comentario: datos.comentario || "(sin comentario)",
        mensaje,
      });
    } catch (err) {
      console.error("EmailJS (reserva):", err);
      emailOk = false;
    }

    showStatus(
      statusEl,
      emailOk
        ? "¡Reserva confirmada! Te llega un email con los detalles."
        : "¡Reserva confirmada! (no pudimos enviar el email de confirmación, pero tu turno ya está guardado).",
      "success"
    );
    form.reset();
    await actualizarHorariosDisponibles(datos.fecha);
  } catch (err) {
    console.error("Error al guardar la reserva:", err);
    showStatus(statusEl, "No pudimos guardar tu reserva. Probá de nuevo o escribinos por WhatsApp.", "error");
  } finally {
    setLoading(btn, false);
  }
}

// ============================================================
// SELECTOR DE ESTRELLAS
// ============================================================
let calificacionSeleccionada = 0;

function pintarEstrellas(valor) {
  document.querySelectorAll("#star-picker .star").forEach((s) => {
    const v = Number(s.dataset.value);
    s.classList.toggle("is-active", v <= valor);
    s.setAttribute("aria-pressed", v <= valor ? "true" : "false");
  });
}

function initStarPicker() {
  document.querySelectorAll("#star-picker .star").forEach((s) => {
    s.addEventListener("click", () => {
      calificacionSeleccionada = Number(s.dataset.value);
      document.getElementById("v-rating").value = calificacionSeleccionada;
      pintarEstrellas(calificacionSeleccionada);
    });
    s.addEventListener("mouseenter", () => pintarEstrellas(Number(s.dataset.value)));
    s.addEventListener("mouseleave", () => pintarEstrellas(calificacionSeleccionada));
  });
}

function resetStarPicker() {
  calificacionSeleccionada = 0;
  document.getElementById("v-rating").value = "";
  pintarEstrellas(0);
}

// ============================================================
// RESEÑAS: envío del formulario
// ============================================================
async function manejarSubmitResena(e) {
  e.preventDefault();
  const form = e.target;
  const statusEl = document.getElementById("review-status");
  const btn = document.getElementById("review-submit");

  if (form.website.value) return; // trampa anti-spam

  const nombre = form.nombre.value.trim();
  const comentario = form.comentario.value.trim();
  const calificacion = Number(document.getElementById("v-rating").value || 0);

  if (!nombre || !comentario) {
    showStatus(statusEl, "Completá tu nombre y tu comentario.", "error");
    return;
  }
  if (!calificacion) {
    showStatus(statusEl, "Elegí una calificación de 1 a 5 estrellas.", "error");
    return;
  }

  setLoading(btn, true, "Enviando...");
  showStatus(statusEl, "", "");

  try {
    await addDoc(collection(db, "resenas"), {
      nombre,
      calificacion,
      comentario,
      creadoEn: serverTimestamp(),
    });

    const mensaje = `Nueva reseña\nNombre: ${nombre}\nCalificación: ${calificacion}/5\nComentario: ${comentario}`;

    // Acá "email" es el TUYO (dueño del negocio), tomado de NEGOCIO.email,
    // para que te enteres de la reseña nueva por mail.
    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_RESENA, {
        email: NEGOCIO.email,
        nombre,
        calificacion,
        comentario,
        mensaje,
      });
    } catch (err) {
      console.error("EmailJS (reseña):", err);
    }

    showStatus(statusEl, "¡Gracias por tu reseña!", "success");
    form.reset();
    resetStarPicker();
  } catch (err) {
    console.error("Error al guardar la reseña:", err);
    showStatus(statusEl, "No pudimos enviar tu reseña. Probá de nuevo en un momento.", "error");
  } finally {
    setLoading(btn, false);
  }
}

// ============================================================
// RESEÑAS: mostrarlas en vivo (se actualizan solas al llegar una nueva)
// ============================================================
function crearEstrellasHTML(calificacion) {
  // Genera solo texto fijo (★) repetido; no incluye nada escrito
  // por usuarios, así que es seguro usarlo con innerHTML.
  let html = "";
  for (let i = 1; i <= 5; i++) {
    html += `<span class="review-star ${i <= calificacion ? "is-filled" : ""}" aria-hidden="true">★</span>`;
  }
  return html;
}

function renderResenas(snapshot) {
  const cont = document.getElementById("reviews-list");
  cont.innerHTML = "";

  if (snapshot.empty) {
    const p = document.createElement("p");
    p.className = "reviews-empty";
    p.textContent = "Todavía no hay reseñas — quizás la tuya sea la primera 🌿";
    cont.appendChild(p);
    return;
  }

  snapshot.forEach((docSnap) => {
    const r = docSnap.data();
    const card = document.createElement("article");
    card.className = "review-card";

    const stars = document.createElement("div");
    stars.className = "review-stars";
    stars.setAttribute("aria-label", `${r.calificacion} de 5 estrellas`);
    stars.innerHTML = crearEstrellasHTML(r.calificacion);

    // Usamos textContent (no innerHTML) para todo lo que escribió
    // una persona, así evitamos que se pueda meter código/HTML.
    const comment = document.createElement("p");
    comment.className = "review-comment";
    comment.textContent = `“${r.comentario}”`;

    const author = document.createElement("p");
    author.className = "review-author";
    author.textContent = r.nombre + (r.creadoEn ? " · " + formatearFecha(r.creadoEn) : "");

    card.append(stars, comment, author);
    cont.appendChild(card);
  });
}

function suscribirseAResenas() {
  const cont = document.getElementById("reviews-list");
  const q = query(collection(db, "resenas"), orderBy("creadoEn", "desc"), limit(9));
  onSnapshot(
    q,
    (snapshot) => renderResenas(snapshot),
    (error) => {
      console.error("Error al leer reseñas:", error);
      cont.innerHTML = '<p class="reviews-empty">No pudimos cargar las reseñas ahora mismo.</p>';
    }
  );
}

// ============================================================
// NAV MÓVIL
// ============================================================
function initNavMovil() {
  const toggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("nav");
  toggle.addEventListener("click", () => {
    const abierto = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", abierto ? "true" : "false");
  });
  nav.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

// ============================================================
// INICIO
// ============================================================
function init() {
  renderDatosNegocio();
  renderServicios();
  initStarPicker();
  initNavMovil();
  suscribirseAResenas();

  const fechaInput = document.getElementById("r-fecha");
  fechaInput.min = hoyISO();
  fechaInput.addEventListener("change", (e) => actualizarHorariosDisponibles(e.target.value));

  document.getElementById("reserva-form").addEventListener("submit", manejarSubmitReserva);
  document.getElementById("review-form").addEventListener("submit", manejarSubmitResena);
}

document.addEventListener("DOMContentLoaded", init);

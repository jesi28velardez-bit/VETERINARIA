/* ==========================================================================
   Veterinaria Patitas
   REGISTRO DE IA: (pegá acá tu comentario de registro de IA)
   ========================================================================== */


/* ==========================================================================
   1. DATOS
   Campos tomados de los formularios del index.html.
   Cada registro tiene un "id" propio; las relaciones se hacen con ese id:
   mascotas.duenoId -> duenos.id
   turnos.mascotaId y consultas.mascotaId -> mascotas.id
   ========================================================================== */

const CLAVE_STORAGE = "veterinaria-datos";

// duenos:    { id, nombre, telefono, email, direccion }
const duenos = [];

// mascotas:  { id, duenoId, nombre, especie, raza, sexo, nacimiento, peso }
const mascotas = [];

// turnos:    { id, mascotaId, fecha, hora, motivo, veterinario, estado }
const turnos = [];

// consultas: { id, mascotaId, fecha, motivo, peso, diagnostico, tratamiento, observaciones }
const consultas = [];

/** Genera un id único para un registro nuevo. */
function nuevoId() {
  if (window.crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}


/* ==========================================================================
   2. PERSISTENCIA (localStorage, clave "veterinaria-datos")
   Se guarda un solo objeto con los cuatro arrays.
   Llamá a guardarDatos() después de agregar, editar o borrar algo.
   ========================================================================== */

function guardarDatos() {
  try {
    localStorage.setItem(
      CLAVE_STORAGE,
      JSON.stringify({ duenos, mascotas, turnos, consultas })
    );
    return true;
  } catch (error) {
    console.error("No se pudieron guardar los datos:", error);
    return false;
  }
}

function cargarDatos() {
  try {
    const crudo = localStorage.getItem(CLAVE_STORAGE);
    if (!crudo) return;

    const datos = JSON.parse(crudo);
    // Se rellenan los arrays existentes para no perder las referencias
    duenos.splice(0, duenos.length, ...(datos.duenos || []));
    mascotas.splice(0, mascotas.length, ...(datos.mascotas || []));
    turnos.splice(0, turnos.length, ...(datos.turnos || []));
    consultas.splice(0, consultas.length, ...(datos.consultas || []));
  } catch (error) {
    console.error("No se pudieron leer los datos guardados:", error);
  }
}

cargarDatos();


/* ==========================================================================
   3. MENÚ: una sola sección visible por vez
   ========================================================================== */

const SECCIONES = ["duenos", "mascotas", "turnos", "historias"];
const SECCION_INICIAL = "duenos";

function mostrarSeccion(id) {
  if (!SECCIONES.includes(id)) id = SECCION_INICIAL;

  SECCIONES.forEach((seccion) => {
    const elemento = document.getElementById(seccion);
    if (elemento) elemento.hidden = seccion !== id;
  });

  document.querySelectorAll("#menu a[data-seccion]").forEach((enlace) => {
    const activo = enlace.dataset.seccion === id;
    enlace.classList.toggle("activo", activo);
    if (activo) {
      enlace.setAttribute("aria-current", "page");
    } else {
      enlace.removeAttribute("aria-current");
    }
  });
}

function seccionDesdeHash() {
  return location.hash.replace("#", "");
}

// Al hacer clic en el menú cambia el hash, y de ahí se muestra la sección
window.addEventListener("hashchange", () => mostrarSeccion(seccionDesdeHash()));

// Primera carga: respeta el hash de la URL o arranca en Dueños
mostrarSeccion(seccionDesdeHash());


/* ==========================================================================
   4. EDAD
   edad("2024-08-15") -> "2 años y 3 meses", "1 año", "5 meses", etc.
   Recibe la fecha como la devuelve <input type="date"> (AAAA-MM-DD).
   Devuelve "" si la fecha está vacía, es inválida o es futura.
   ========================================================================== */

function edad(fechaNacimiento) {
  if (!fechaNacimiento) return "";

  // Se arma con partes numéricas para evitar problemas de zona horaria
  const partes = String(fechaNacimiento).split("-").map(Number);
  const [anio, mes, dia] = partes;
  if (partes.length !== 3 || partes.some(Number.isNaN)) return "";

  const hoy = new Date();
  let totalMeses =
    (hoy.getFullYear() - anio) * 12 + (hoy.getMonth() + 1 - mes);

  // Si todavía no llegó el día del mes del cumpleaños/mesversario, falta un mes
  if (hoy.getDate() < dia) totalMeses--;

  if (totalMeses < 0) return "";
  if (totalMeses === 0) return "menos de 1 mes";

  const anios = Math.floor(totalMeses / 12);
  const meses = totalMeses % 12;

  const textoAnios = anios === 1 ? "1 año" : `${anios} años`;
  const textoMeses = meses === 1 ? "1 mes" : `${meses} meses`;

  if (anios === 0) return textoMeses;
  if (meses === 0) return textoAnios;
  return `${textoAnios} y ${textoMeses}`;
}


/* ==========================================================================
   5. DUEÑOS: alta, listado, edición y baja
   ========================================================================== */

const formDueno = document.getElementById("form-dueno");
const listaDuenos = document.getElementById("lista-duenos");
const campoDueno = {
  id: document.getElementById("dueno-id"),
  nombre: document.getElementById("dueno-nombre"),
  telefono: document.getElementById("dueno-telefono"),
  email: document.getElementById("dueno-email"),
  direccion: document.getElementById("dueno-direccion"),
};

// La validación la hace este código (con mensajes propios), no el navegador
formDueno.noValidate = true;

const REGEX_TELEFONO = /^[0-9 -]+$/;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

let idDuenoEnEdicion = null; // id del dueño que se está editando (null = alta)
let avisoDueno = null; // { id, texto }: aviso que se muestra dentro de una tarjeta

/** Crea un elemento con clase y texto (el texto va como texto, nunca como HTML). */
function crearElemento(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

/** Guarda y, si el navegador no deja, avisa. */
function guardarOAvisar() {
  if (!guardarDatos()) {
    alert(
      "No se pudieron guardar los datos en este navegador. " +
        "Si cerrás la página, vas a perder los cambios."
    );
  }
}

function mascotasDeDueno(duenoId) {
  return mascotas.filter((mascota) => mascota.duenoId === duenoId);
}

/** Deja solo los dígitos: "11 2345-6789" y "1123456789" cuentan como el mismo teléfono. */
function normalizarTelefono(telefono) {
  return telefono.replace(/[\s-]/g, "");
}


/* ---------- Validación ---------- */

function leerFormularioDueno() {
  return {
    nombre: campoDueno.nombre.value.trim(),
    telefono: campoDueno.telefono.value.trim(),
    email: campoDueno.email.value.trim(),
    direccion: campoDueno.direccion.value.trim(),
  };
}

/** Devuelve un objeto { campo: "mensaje" } con los errores; vacío si todo está bien. */
function validarDueno(datos, idActual) {
  const errores = {};

  if (!datos.nombre) {
    errores.nombre = "El nombre es obligatorio.";
  }

  if (!datos.telefono) {
    errores.telefono = "El teléfono es obligatorio.";
  } else if (!REGEX_TELEFONO.test(datos.telefono) || !/\d/.test(datos.telefono)) {
    errores.telefono = "Usá solo números, espacios y guiones.";
  } else {
    const repetido = duenos.find(
      (dueno) =>
        dueno.id !== idActual &&
        normalizarTelefono(dueno.telefono) === normalizarTelefono(datos.telefono)
    );
    if (repetido) {
      errores.telefono = `Ya hay un dueño con ese teléfono: ${repetido.nombre}.`;
    }
  }

  if (datos.email && !REGEX_EMAIL.test(datos.email)) {
    errores.email = "Revisá el email: tiene que verse como nombre@correo.com.";
  }

  return errores;
}

/** Muestra (o borra, si no hay mensaje) el error debajo de un campo. */
function mostrarErrorCampo(campo, mensaje) {
  let nodo = campo.parentElement.querySelector(".mensaje-error");

  if (!mensaje) {
    if (nodo) nodo.remove();
    campo.classList.remove("campo-invalido");
    campo.removeAttribute("aria-invalid");
    campo.removeAttribute("aria-describedby");
    return;
  }

  if (!nodo) {
    nodo = crearElemento("p", "mensaje-error");
    nodo.id = `${campo.id}-error`;
    nodo.setAttribute("role", "alert");
    campo.parentElement.appendChild(nodo);
  }
  nodo.textContent = mensaje;
  campo.classList.add("campo-invalido");
  campo.setAttribute("aria-invalid", "true");
  campo.setAttribute("aria-describedby", nodo.id);
}

function limpiarErroresDueno() {
  ["nombre", "telefono", "email", "direccion"].forEach((nombre) =>
    mostrarErrorCampo(campoDueno[nombre], "")
  );
}

// El error de un campo se borra apenas la persona vuelve a escribir en él
["nombre", "telefono", "email", "direccion"].forEach((nombre) => {
  campoDueno[nombre].addEventListener("input", () =>
    mostrarErrorCampo(campoDueno[nombre], "")
  );
});


/* ---------- Listado ---------- */

function crearTarjetaDueno(dueno) {
  const tarjeta = crearElemento("li", "dueno");
  if (dueno.id === idDuenoEnEdicion) tarjeta.classList.add("editando");

  tarjeta.appendChild(crearElemento("h4", "tarjeta__titulo", `👤 ${dueno.nombre}`));
  tarjeta.appendChild(crearElemento("p", "tarjeta__meta", `📞 ${dueno.telefono}`));
  if (dueno.email) {
    tarjeta.appendChild(crearElemento("p", "tarjeta__meta", `✉️ ${dueno.email}`));
  }
  if (dueno.direccion) {
    tarjeta.appendChild(crearElemento("p", "tarjeta__meta", `📍 ${dueno.direccion}`));
  }

  // Nombres de sus mascotas
  const suyas = mascotasDeDueno(dueno.id);
  if (suyas.length === 0) {
    tarjeta.appendChild(
      crearElemento("p", "tarjeta__meta", "🐾 Sin mascotas registradas")
    );
  } else {
    tarjeta.appendChild(
      crearElemento("p", "tarjeta__meta", `🐾 Mascotas (${suyas.length})`)
    );
    const chips = crearElemento("div", "chips");
    suyas.forEach((mascota) => chips.appendChild(crearElemento("span", "chip", mascota.nombre)));
    tarjeta.appendChild(chips);
  }

  // Aviso (por ejemplo, cuando no se puede eliminar)
  if (avisoDueno && avisoDueno.id === dueno.id) {
    const aviso = crearElemento("p", "aviso", avisoDueno.texto);
    aviso.setAttribute("role", "alert");
    tarjeta.appendChild(aviso);
  }

  // Acciones
  const acciones = crearElemento("div", "tarjeta__acciones");
  const botonEditar = crearElemento("button", "btn-chico", "✏️ Editar");
  botonEditar.type = "button";
  botonEditar.dataset.accion = "editar";
  botonEditar.dataset.id = dueno.id;

  const botonEliminar = crearElemento("button", "btn-chico btn-peligro", "🗑️ Eliminar");
  botonEliminar.type = "button";
  botonEliminar.dataset.accion = "eliminar";
  botonEliminar.dataset.id = dueno.id;

  acciones.append(botonEditar, botonEliminar);
  tarjeta.appendChild(acciones);

  return tarjeta;
}

function renderDuenos() {
  const ordenados = [...duenos].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  // Sin dueños la lista queda vacía y el CSS muestra el mensaje "Todavía no cargaste dueños"
  listaDuenos.replaceChildren(...ordenados.map(crearTarjetaDueno));

  // Al cambiar los dueños se actualiza el select de la sección Mascotas
  // y las tarjetas de mascotas (que muestran el nombre del dueño)
  actualizarSelectDuenos();
  renderMascotas();
}


/* ---------- Alta y edición ---------- */

function actualizarBotonesFormDueno() {
  const editando = idDuenoEnEdicion !== null;
  formDueno.querySelector('button[type="submit"]').textContent = editando
    ? "Guardar cambios"
    : "Guardar dueño";
  formDueno.querySelector('button[type="reset"]').textContent = editando
    ? "Cancelar edición"
    : "Cancelar";
}

formDueno.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const datos = leerFormularioDueno();
  const errores = validarDueno(datos, idDuenoEnEdicion);

  limpiarErroresDueno();
  const camposConError = Object.keys(errores);
  if (camposConError.length > 0) {
    camposConError.forEach((nombre) => mostrarErrorCampo(campoDueno[nombre], errores[nombre]));
    campoDueno[camposConError[0]].focus();
    return;
  }

  if (idDuenoEnEdicion) {
    const existente = duenos.find((dueno) => dueno.id === idDuenoEnEdicion);
    if (existente) Object.assign(existente, datos);
  } else {
    duenos.push({ id: nuevoId(), ...datos });
  }

  avisoDueno = null;
  guardarOAvisar();

  // reset() dispara el evento "reset" de abajo, que sale del modo edición y redibuja la lista
  formDueno.reset();
});

formDueno.addEventListener("reset", () => {
  idDuenoEnEdicion = null;
  campoDueno.id.value = "";
  limpiarErroresDueno();
  actualizarBotonesFormDueno();
  renderDuenos();
});

function editarDueno(id) {
  const dueno = duenos.find((item) => item.id === id);
  if (!dueno) return;

  avisoDueno = null;
  limpiarErroresDueno();

  idDuenoEnEdicion = dueno.id;
  campoDueno.id.value = dueno.id;
  campoDueno.nombre.value = dueno.nombre;
  campoDueno.telefono.value = dueno.telefono;
  campoDueno.email.value = dueno.email || "";
  campoDueno.direccion.value = dueno.direccion || "";

  actualizarBotonesFormDueno();
  renderDuenos();

  formDueno.scrollIntoView({ behavior: "smooth", block: "start" });
  campoDueno.nombre.focus({ preventScroll: true });
}


/* ---------- Baja ---------- */

function eliminarDueno(id) {
  const posicion = duenos.findIndex((item) => item.id === id);
  if (posicion === -1) return;
  const dueno = duenos[posicion];

  // No se puede borrar un dueño con mascotas: se avisa cuántas tiene
  const suyas = mascotasDeDueno(id);
  if (suyas.length > 0) {
    const cantidad = suyas.length;
    const nombres = suyas.map((mascota) => mascota.nombre).join(", ");
    avisoDueno = {
      id,
      texto:
        `No se puede eliminar a ${dueno.nombre}: tiene ${cantidad} ` +
        `${cantidad === 1 ? "mascota" : "mascotas"} (${nombres}). ` +
        `Primero eliminá ${cantidad === 1 ? "esa mascota" : "esas mascotas"} ` +
        `o pasala${cantidad === 1 ? "" : "s"} a otro dueño.`,
    };
    renderDuenos();
    return;
  }

  if (!confirm(`¿Eliminar a ${dueno.nombre}? Esta acción no se puede deshacer.`)) return;

  duenos.splice(posicion, 1);
  avisoDueno = null;
  guardarOAvisar();

  if (idDuenoEnEdicion === id) {
    formDueno.reset(); // sale del modo edición y redibuja
  } else {
    renderDuenos();
  }
}

// Un solo "oyente" para los botones de todas las tarjetas
listaDuenos.addEventListener("click", (evento) => {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton) return;

  if (boton.dataset.accion === "editar") editarDueno(boton.dataset.id);
  if (boton.dataset.accion === "eliminar") eliminarDueno(boton.dataset.id);
});

actualizarBotonesFormDueno();


/* ==========================================================================
   6. MASCOTAS: alta, listado, edición y baja
   ========================================================================== */

const formMascota = document.getElementById("form-mascota");
const listaMascotas = document.getElementById("lista-mascotas");
const campoMascota = {
  id: document.getElementById("mascota-id"),
  duenoId: document.getElementById("mascota-dueno"),
  nombre: document.getElementById("mascota-nombre"),
  especie: document.getElementById("mascota-especie"),
  raza: document.getElementById("mascota-raza"),
  sexo: document.getElementById("mascota-sexo"),
  nacimiento: document.getElementById("mascota-nacimiento"),
  peso: document.getElementById("mascota-peso"),
};
const CAMPOS_MASCOTA = ["duenoId", "nombre", "especie", "raza", "sexo", "nacimiento", "peso"];

formMascota.noValidate = true;

const PESO_MINIMO = 0.1;
const PESO_MAXIMO = 120;
const ANIO_MINIMO_NACIMIENTO = 1900;

// Un turno está pendiente mientras no esté atendido ni cancelado
// (cuenta como pendiente "Pendiente", "Confirmado" o un turno sin estado)
const ESTADOS_CERRADOS = ["Atendido", "Cancelado"];

let idMascotaEnEdicion = null;
let avisoMascota = null; // { id, texto }

function turnoEstaPendiente(turno) {
  return !ESTADOS_CERRADOS.includes(turno.estado);
}

/** Hoy en formato AAAA-MM-DD según la fecha local (sirve para comparar con <input type="date">). */
function hoyISO() {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

/** Minúsculas y sin tildes: "Fido", "fido" y "FÍDO" cuentan como el mismo nombre. */
function normalizarNombre(texto) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatearPeso(peso) {
  return `${peso.toLocaleString("es-AR")} kg`;
}

// Que el selector de fecha no deje elegir días futuros, y límites del peso
campoMascota.nacimiento.max = hoyISO();
campoMascota.peso.min = String(PESO_MINIMO);
campoMascota.peso.max = String(PESO_MAXIMO);


/* ---------- Select de dueños ---------- */

/** Rearma las opciones del select de dueños (se llama cada vez que cambian los dueños). */
function actualizarSelectDuenos() {
  const select = campoMascota.duenoId;
  const seleccionado = select.value;

  const inicial = document.createElement("option");
  inicial.value = "";
  inicial.textContent = duenos.length ? "Elegí un dueño" : "Primero cargá un dueño";

  const opciones = [...duenos]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    .map((dueno) => {
      const opcion = document.createElement("option");
      opcion.value = dueno.id;
      opcion.textContent = `${dueno.nombre} (${dueno.telefono})`;
      return opcion;
    });

  select.replaceChildren(inicial, ...opciones);
  if (duenos.some((dueno) => dueno.id === seleccionado)) select.value = seleccionado;
}


/* ---------- Validación ---------- */

function leerFormularioMascota() {
  const textoPeso = campoMascota.peso.value.trim().replace(",", ".");
  // Si escribieron algo que el navegador no entiende como número, value llega vacío
  const pesoIlegible = campoMascota.peso.validity.badInput;

  return {
    duenoId: campoMascota.duenoId.value,
    nombre: campoMascota.nombre.value.trim(),
    especie: campoMascota.especie.value,
    raza: campoMascota.raza.value.trim(),
    sexo: campoMascota.sexo.value,
    nacimiento: campoMascota.nacimiento.value,
    peso: textoPeso === "" ? null : Number(textoPeso),
    pesoIlegible,
  };
}

/** Devuelve el mensaje de error de una fecha de nacimiento, o "" si está bien. */
function errorFechaNacimiento(texto) {
  if (!texto) return "La fecha de nacimiento es obligatoria.";

  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!partes) return "La fecha de nacimiento no es válida.";

  const [anio, mes, dia] = partes.slice(1).map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  const existe =
    fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
  if (!existe || anio < ANIO_MINIMO_NACIMIENTO) return "La fecha de nacimiento no es válida.";

  if (texto > hoyISO()) return "La fecha de nacimiento no puede ser futura.";
  return "";
}

/** Devuelve { campo: "mensaje" } con los errores; vacío si todo está bien. */
function validarMascota(datos, idActual) {
  const errores = {};

  if (!datos.duenoId) {
    errores.duenoId = duenos.length
      ? "Elegí un dueño."
      : "Primero cargá un dueño en la sección Dueños.";
  } else if (!duenos.some((dueno) => dueno.id === datos.duenoId)) {
    errores.duenoId = "El dueño elegido ya no existe. Elegí otro.";
  }

  if (!datos.nombre) {
    errores.nombre = "El nombre es obligatorio.";
  } else if (datos.duenoId) {
    const repetida = mascotas.find(
      (mascota) =>
        mascota.id !== idActual &&
        mascota.duenoId === datos.duenoId &&
        normalizarNombre(mascota.nombre) === normalizarNombre(datos.nombre)
    );
    if (repetida) {
      errores.nombre = `Este dueño ya tiene una mascota llamada ${repetida.nombre}.`;
    }
  }

  if (!datos.especie) {
    errores.especie = "Elegí una especie.";
  }

  const errorFecha = errorFechaNacimiento(datos.nacimiento);
  if (errorFecha) errores.nacimiento = errorFecha;

  if (datos.pesoIlegible || Number.isNaN(datos.peso)) {
    errores.peso = "Ingresá un peso válido, por ejemplo 4,5.";
  } else if (datos.peso !== null && (datos.peso < PESO_MINIMO || datos.peso > PESO_MAXIMO)) {
    errores.peso = "El peso tiene que estar entre 0,1 y 120 kg.";
  }

  return errores;
}

function limpiarErroresMascota() {
  CAMPOS_MASCOTA.forEach((nombre) => mostrarErrorCampo(campoMascota[nombre], ""));
}

CAMPOS_MASCOTA.forEach((nombre) => {
  const borrarError = () => mostrarErrorCampo(campoMascota[nombre], "");
  campoMascota[nombre].addEventListener("input", borrarError);
  campoMascota[nombre].addEventListener("change", borrarError);
});

// Si cambia el dueño, el aviso de nombre repetido puede dejar de aplicar
campoMascota.duenoId.addEventListener("change", () =>
  mostrarErrorCampo(campoMascota.nombre, "")
);


/* ---------- Listado ---------- */

function crearTarjetaMascota(mascota) {
  const tarjeta = crearElemento("li", "mascota");
  tarjeta.dataset.especie = mascota.especie; // el CSS pone el emoji según este dato
  if (mascota.id === idMascotaEnEdicion) tarjeta.classList.add("editando");

  const info = crearElemento("div", "mascota__info");
  info.appendChild(crearElemento("h4", "tarjeta__titulo", mascota.nombre));

  const descripcion = [mascota.especie, mascota.raza, mascota.sexo].filter(Boolean).join(", ");
  info.appendChild(crearElemento("p", "tarjeta__meta", descripcion));

  const edadTexto = edad(mascota.nacimiento);
  if (edadTexto) {
    info.appendChild(crearElemento("p", "tarjeta__meta", `🎂 ${edadTexto}`));
  }

  if (typeof mascota.peso === "number") {
    info.appendChild(crearElemento("p", "tarjeta__meta", `⚖️ ${formatearPeso(mascota.peso)}`));
  }

  const dueno = duenos.find((item) => item.id === mascota.duenoId);
  info.appendChild(
    crearElemento("p", "tarjeta__meta", `👤 Dueño: ${dueno ? dueno.nombre : "sin dueño"}`)
  );

  if (avisoMascota && avisoMascota.id === mascota.id) {
    const aviso = crearElemento("p", "aviso", avisoMascota.texto);
    aviso.setAttribute("role", "alert");
    info.appendChild(aviso);
  }

  const acciones = crearElemento("div", "tarjeta__acciones");
  const botonEditar = crearElemento("button", "btn-chico", "✏️ Editar");
  botonEditar.type = "button";
  botonEditar.dataset.accion = "editar";
  botonEditar.dataset.id = mascota.id;

  const botonEliminar = crearElemento("button", "btn-chico btn-peligro", "🗑️ Eliminar");
  botonEliminar.type = "button";
  botonEliminar.dataset.accion = "eliminar";
  botonEliminar.dataset.id = mascota.id;

  acciones.append(botonEditar, botonEliminar);
  info.appendChild(acciones);

  tarjeta.appendChild(info);
  return tarjeta;
}

function renderMascotas() {
  const ordenadas = [...mascotas].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  // Sin mascotas la lista queda vacía y el CSS muestra "Todavía no cargaste mascotas"
  listaMascotas.replaceChildren(...ordenadas.map(crearTarjetaMascota));

  // Al cambiar mascotas o dueños se actualiza el select de la sección Turnos
  // y la agenda (que muestra el nombre de la mascota y del dueño)
  actualizarSelectMascotas();
  renderAgenda();
}


/* ---------- Alta y edición ---------- */

function actualizarBotonesFormMascota() {
  const editando = idMascotaEnEdicion !== null;
  formMascota.querySelector('button[type="submit"]').textContent = editando
    ? "Guardar cambios"
    : "Guardar mascota";
  formMascota.querySelector('button[type="reset"]').textContent = editando
    ? "Cancelar edición"
    : "Cancelar";
}

formMascota.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const datos = leerFormularioMascota();
  const errores = validarMascota(datos, idMascotaEnEdicion);

  limpiarErroresMascota();
  const camposConError = Object.keys(errores);
  if (camposConError.length > 0) {
    camposConError.forEach((nombre) => mostrarErrorCampo(campoMascota[nombre], errores[nombre]));
    // Se enfoca el primer campo con error en el orden en que aparecen en el formulario
    const primero = CAMPOS_MASCOTA.find((nombre) => errores[nombre]);
    campoMascota[primero].focus();
    return;
  }

  const registro = {
    duenoId: datos.duenoId,
    nombre: datos.nombre,
    especie: datos.especie,
    raza: datos.raza,
    sexo: datos.sexo,
    nacimiento: datos.nacimiento,
    peso: datos.peso, // número o null
  };

  if (idMascotaEnEdicion) {
    const existente = mascotas.find((mascota) => mascota.id === idMascotaEnEdicion);
    if (existente) Object.assign(existente, registro);
  } else {
    mascotas.push({ id: nuevoId(), ...registro });
  }

  avisoMascota = null;
  guardarOAvisar();

  formMascota.reset(); // sale del modo edición y redibuja las mascotas
  renderDuenos(); // actualiza las mascotas que se ven en la tarjeta de cada dueño
});

formMascota.addEventListener("reset", () => {
  idMascotaEnEdicion = null;
  campoMascota.id.value = "";
  limpiarErroresMascota();
  actualizarBotonesFormMascota();
  renderMascotas();
});

function editarMascota(id) {
  const mascota = mascotas.find((item) => item.id === id);
  if (!mascota) return;

  avisoMascota = null;
  limpiarErroresMascota();

  idMascotaEnEdicion = mascota.id;
  campoMascota.id.value = mascota.id;
  campoMascota.duenoId.value = mascota.duenoId;
  campoMascota.nombre.value = mascota.nombre;
  campoMascota.especie.value = mascota.especie;
  campoMascota.raza.value = mascota.raza || "";
  campoMascota.sexo.value = mascota.sexo || "";
  campoMascota.nacimiento.value = mascota.nacimiento || "";
  campoMascota.peso.value = typeof mascota.peso === "number" ? mascota.peso : "";

  actualizarBotonesFormMascota();
  renderMascotas();

  formMascota.scrollIntoView({ behavior: "smooth", block: "start" });
  campoMascota.nombre.focus({ preventScroll: true });
}


/* ---------- Baja ---------- */

function eliminarMascota(id) {
  const posicion = mascotas.findIndex((item) => item.id === id);
  if (posicion === -1) return;
  const mascota = mascotas[posicion];

  // No se puede borrar una mascota con turnos pendientes
  const pendientes = turnos.filter(
    (turno) => turno.mascotaId === id && turnoEstaPendiente(turno)
  );
  if (pendientes.length > 0) {
    const cantidad = pendientes.length;
    avisoMascota = {
      id,
      texto:
        `No se puede eliminar a ${mascota.nombre}: tiene ${cantidad} ` +
        `${cantidad === 1 ? "turno pendiente" : "turnos pendientes"}. ` +
        `Primero cancelá ${cantidad === 1 ? "ese turno" : "esos turnos"} o marcalo` +
        `${cantidad === 1 ? "" : "s"} como atendido${cantidad === 1 ? "" : "s"}.`,
    };
    renderMascotas();
    return;
  }

  // Lo que se borra junto con la mascota (turnos ya cerrados y su historia clínica)
  const turnosPrevios = turnos.filter((turno) => turno.mascotaId === id).length;
  const consultasPrevias = consultas.filter((consulta) => consulta.mascotaId === id).length;

  let mensaje = `¿Eliminar a ${mascota.nombre}? Esta acción no se puede deshacer.`;
  const tambien = [];
  if (consultasPrevias > 0) {
    tambien.push(`${consultasPrevias} ${consultasPrevias === 1 ? "consulta" : "consultas"}`);
  }
  if (turnosPrevios > 0) {
    tambien.push(`${turnosPrevios} ${turnosPrevios === 1 ? "turno anterior" : "turnos anteriores"}`);
  }
  if (tambien.length > 0) {
    mensaje += `\n\nTambién se borrarán sus ${tambien.join(" y ")}.`;
  }

  if (!confirm(mensaje)) return;

  mascotas.splice(posicion, 1);
  for (let i = turnos.length - 1; i >= 0; i--) {
    if (turnos[i].mascotaId === id) turnos.splice(i, 1);
  }
  for (let i = consultas.length - 1; i >= 0; i--) {
    if (consultas[i].mascotaId === id) consultas.splice(i, 1);
  }

  avisoMascota = null;
  guardarOAvisar();

  if (idMascotaEnEdicion === id) formMascota.reset(); // sale del modo edición
  renderDuenos(); // actualiza dueños y redibuja las mascotas
}

listaMascotas.addEventListener("click", (evento) => {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton) return;

  if (boton.dataset.accion === "editar") editarMascota(boton.dataset.id);
  if (boton.dataset.accion === "eliminar") eliminarMascota(boton.dataset.id);
});


actualizarBotonesFormMascota();


/* ==========================================================================
   7. TURNOS: alta, edición, baja, estados y agenda por día
   Cada turno: { id, mascotaId, fecha (AAAA-MM-DD), hora (HH:MM),
                 motivo, veterinario, estado: "Pendiente" | "Atendido" | "Cancelado" }
   ========================================================================== */

const formTurno = document.getElementById("form-turno");
const agendaTurnos = document.getElementById("agenda-turnos");
const agendaTitulo = document.getElementById("agenda-titulo");
const agendaFecha = document.getElementById("agenda-fecha");
const campoTurno = {
  id: document.getElementById("turno-id"),
  mascotaId: document.getElementById("turno-mascota"),
  fecha: document.getElementById("turno-fecha"),
  hora: document.getElementById("turno-hora"),
  motivo: document.getElementById("turno-motivo"),
  veterinario: document.getElementById("turno-veterinario"),
};
const CAMPOS_TURNO = ["mascotaId", "fecha", "hora", "motivo", "veterinario"];

formTurno.noValidate = true;

const HORA_APERTURA = "09:00";
const HORA_CIERRE = "20:00"; // el turno de las 20:00 todavía es válido

let idTurnoEnEdicion = null;
let diaAgenda = hoyISO(); // día que se está viendo en la agenda

campoTurno.fecha.min = hoyISO();
campoTurno.hora.min = HORA_APERTURA;
campoTurno.hora.max = HORA_CIERRE;


/* ---------- Fechas ---------- */

/** Convierte un Date a AAAA-MM-DD (fecha local). */
function aISO(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Suma (o resta) días a una fecha AAAA-MM-DD. */
function sumarDias(iso, cantidad) {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return aISO(new Date(anio, mes - 1, dia + cantidad));
}

/** true si el texto es AAAA-MM-DD y es un día que existe (no 2026-02-31). */
function fechaISOExiste(texto) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto || "");
  if (!partes) return false;
  const [anio, mes, dia] = partes.slice(1).map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
}

/** "2026-11-13" -> "13/11/2026" */
function fechaCorta(iso) {
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

/** "2026-11-13" -> "Viernes, 13 de noviembre de 2026" */
function fechaLarga(iso) {
  const [anio, mes, dia] = iso.split("-").map(Number);
  const texto = new Date(anio, mes - 1, dia).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function normalizarVeterinario(texto) {
  return normalizarNombre(texto).replace(/\s+/g, " ");
}


/* ---------- Select de mascotas ---------- */

/** Rearma el select de mascotas (se llama cada vez que cambian mascotas o dueños). */
function actualizarSelectMascotas() {
  const select = campoTurno.mascotaId;
  const seleccionada = select.value;

  const inicial = document.createElement("option");
  inicial.value = "";
  inicial.textContent = mascotas.length ? "Elegí una mascota" : "Primero cargá una mascota";

  const opciones = [...mascotas]
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    .map((mascota) => {
      const dueno = duenos.find((item) => item.id === mascota.duenoId);
      const opcion = document.createElement("option");
      opcion.value = mascota.id;
      opcion.textContent = `${mascota.nombre} (${dueno ? dueno.nombre : "sin dueño"})`;
      return opcion;
    });

  select.replaceChildren(inicial, ...opciones);
  if (mascotas.some((mascota) => mascota.id === seleccionada)) select.value = seleccionada;
}


/* ---------- Validación ---------- */

function leerFormularioTurno() {
  return {
    mascotaId: campoTurno.mascotaId.value,
    fecha: campoTurno.fecha.value,
    hora: campoTurno.hora.value,
    motivo: campoTurno.motivo.value.trim(),
    veterinario: campoTurno.veterinario.value.trim(),
  };
}

/** Devuelve { campo: "mensaje" } con los errores; vacío si todo está bien. */
function validarTurno(datos, idActual) {
  const errores = {};
  const existente = idActual ? turnos.find((turno) => turno.id === idActual) : null;

  // Mascota
  if (!datos.mascotaId) {
    errores.mascotaId = mascotas.length
      ? "Elegí una mascota."
      : "Primero cargá una mascota en la sección Mascotas.";
  } else if (!mascotas.some((mascota) => mascota.id === datos.mascotaId)) {
    errores.mascotaId = "La mascota elegida ya no existe. Elegí otra.";
  }

  // Fecha: no puede ser pasada (hoy sí). Al editar, se tolera la fecha que ya tenía el turno.
  if (!datos.fecha) {
    errores.fecha = "La fecha es obligatoria.";
  } else if (!fechaISOExiste(datos.fecha)) {
    errores.fecha = "La fecha no es válida.";
  } else if (datos.fecha < hoyISO() && !(existente && existente.fecha === datos.fecha)) {
    errores.fecha = "La fecha no puede ser pasada.";
  }

  // Hora: entre las 9:00 y las 20:00 (ambas incluidas)
  if (!datos.hora) {
    errores.hora = "La hora es obligatoria.";
  } else if (!/^\d{2}:\d{2}$/.test(datos.hora) || datos.hora < HORA_APERTURA || datos.hora > HORA_CIERRE) {
    errores.hora = "La hora tiene que estar entre las 9:00 y las 20:00.";
  }

  if (!datos.motivo) errores.motivo = "El motivo es obligatorio.";
  if (!datos.veterinario) errores.veterinario = "El veterinario es obligatorio.";

  // El mismo veterinario no puede tener dos turnos a la misma fecha y hora
  // (un turno cancelado libera el horario)
  const ocupaHorario = !existente || existente.estado !== "Cancelado";
  if (ocupaHorario && !errores.fecha && !errores.hora && !errores.veterinario) {
    const choque = turnos.find(
      (turno) =>
        turno.id !== idActual &&
        turno.estado !== "Cancelado" &&
        turno.fecha === datos.fecha &&
        turno.hora === datos.hora &&
        normalizarVeterinario(turno.veterinario) === normalizarVeterinario(datos.veterinario)
    );
    if (choque) {
      const mascotaChoque = mascotas.find((mascota) => mascota.id === choque.mascotaId);
      errores.veterinario =
        `${choque.veterinario} ya tiene un turno el ${fechaCorta(datos.fecha)} a las ${datos.hora}` +
        (mascotaChoque ? ` (${mascotaChoque.nombre}).` : ".");
    }
  }

  return errores;
}

function limpiarErroresTurno() {
  CAMPOS_TURNO.forEach((nombre) => mostrarErrorCampo(campoTurno[nombre], ""));
}

CAMPOS_TURNO.forEach((nombre) => {
  const borrarError = () => mostrarErrorCampo(campoTurno[nombre], "");
  campoTurno[nombre].addEventListener("input", borrarError);
  campoTurno[nombre].addEventListener("change", borrarError);
});

// El choque de horario depende de fecha, hora y veterinario: si cambia uno, se borra ese aviso
["fecha", "hora"].forEach((nombre) => {
  campoTurno[nombre].addEventListener("change", () =>
    mostrarErrorCampo(campoTurno.veterinario, "")
  );
});

// Al elegir una fecha en el formulario, la agenda muestra ese día (para ver qué horarios hay libres)
campoTurno.fecha.addEventListener("change", () => {
  if (fechaISOExiste(campoTurno.fecha.value)) irADia(campoTurno.fecha.value);
});


/* ---------- Agenda del día ---------- */

function estadoDe(turno) {
  return turno.estado || "Pendiente";
}

function crearTarjetaTurno(turno) {
  const tarjeta = crearElemento("li", "turno");
  if (turno.id === idTurnoEnEdicion) tarjeta.classList.add("editando");

  const mascota = mascotas.find((item) => item.id === turno.mascotaId);
  const dueno = mascota ? duenos.find((item) => item.id === mascota.duenoId) : null;
  const estado = estadoDe(turno);

  tarjeta.appendChild(crearElemento("div", "turno__cuando", `🕘 ${turno.hora}`));

  const info = crearElemento("div", "turno__info");

  const titulo = crearElemento("h4", "tarjeta__titulo");
  titulo.append(
    `🐾 ${mascota ? mascota.nombre : "Mascota eliminada"} `,
    crearElemento("span", `estado estado--${estado.toLowerCase()}`, estado)
  );
  info.appendChild(titulo);

  info.appendChild(crearElemento("p", "tarjeta__meta", `📝 ${turno.motivo}`));
  info.appendChild(
    crearElemento("p", "tarjeta__meta", `👤 Dueño: ${dueno ? dueno.nombre : "sin dueño"}`)
  );
  info.appendChild(crearElemento("p", "tarjeta__meta", `🩺 ${turno.veterinario}`));

  const acciones = crearElemento("div", "tarjeta__acciones");
  const agregarBoton = (texto, accion, clases) => {
    const boton = crearElemento("button", clases, texto);
    boton.type = "button";
    boton.dataset.accion = accion;
    boton.dataset.id = turno.id;
    acciones.appendChild(boton);
  };

  if (turnoEstaPendiente(turno)) {
    agregarBoton("✅ Atendido", "atendido", "btn-chico");
    agregarBoton("❌ Cancelar", "cancelar", "btn-chico btn-peligro");
  }
  agregarBoton("✏️ Editar", "editar", "btn-chico");
  agregarBoton("🗑️ Eliminar", "eliminar", "btn-chico btn-peligro");
  info.appendChild(acciones);

  tarjeta.appendChild(info);
  return tarjeta;
}

function renderAgenda() {
  const delDia = turnos
    .filter((turno) => turno.fecha === diaAgenda)
    .sort(
      (a, b) =>
        a.hora.localeCompare(b.hora) || a.veterinario.localeCompare(b.veterinario, "es")
    );

  const cantidad = delDia.length;
  const resumen =
    cantidad === 0 ? "sin turnos" : cantidad === 1 ? "1 turno" : `${cantidad} turnos`;
  const esHoy = diaAgenda === hoyISO();
  agendaTitulo.textContent = `${fechaLarga(diaAgenda)}${esHoy ? " (hoy)" : ""}: ${resumen}`;
  agendaFecha.value = diaAgenda;

  // Sin turnos la lista queda vacía y el CSS muestra "No hay turnos para este día"
  agendaTurnos.replaceChildren(...delDia.map(crearTarjetaTurno));
}

function irADia(iso) {
  if (!fechaISOExiste(iso)) return;
  diaAgenda = iso;
  renderAgenda();
}

document.getElementById("agenda-anterior").addEventListener("click", () =>
  irADia(sumarDias(diaAgenda, -1))
);
document.getElementById("agenda-siguiente").addEventListener("click", () =>
  irADia(sumarDias(diaAgenda, 1))
);
document.getElementById("agenda-hoy").addEventListener("click", () => irADia(hoyISO()));
agendaFecha.addEventListener("change", () => irADia(agendaFecha.value));


/* ---------- Alta y edición ---------- */

function actualizarBotonesFormTurno() {
  const editando = idTurnoEnEdicion !== null;
  formTurno.querySelector('button[type="submit"]').textContent = editando
    ? "Guardar cambios"
    : "Agendar turno";
  formTurno.querySelector('button[type="reset"]').textContent = editando
    ? "Cancelar edición"
    : "Cancelar";
}

/** El formulario nuevo arranca con el día que se está viendo en la agenda (si no es pasado). */
function precargarFechaTurno() {
  campoTurno.fecha.value = diaAgenda >= hoyISO() ? diaAgenda : "";
}

formTurno.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const datos = leerFormularioTurno();
  const errores = validarTurno(datos, idTurnoEnEdicion);

  limpiarErroresTurno();
  const camposConError = Object.keys(errores);
  if (camposConError.length > 0) {
    camposConError.forEach((nombre) => mostrarErrorCampo(campoTurno[nombre], errores[nombre]));
    const primero = CAMPOS_TURNO.find((nombre) => errores[nombre]);
    campoTurno[primero].focus();
    return;
  }

  if (idTurnoEnEdicion) {
    const existente = turnos.find((turno) => turno.id === idTurnoEnEdicion);
    if (existente) Object.assign(existente, datos); // conserva su estado
  } else {
    turnos.push({ id: nuevoId(), ...datos, estado: "Pendiente" });
  }

  guardarOAvisar();

  formTurno.reset(); // sale del modo edición y redibuja la agenda
  irADia(datos.fecha); // la agenda muestra el día del turno recién guardado
});

formTurno.addEventListener("reset", () => {
  idTurnoEnEdicion = null;
  campoTurno.id.value = "";
  limpiarErroresTurno();
  actualizarBotonesFormTurno();
  renderAgenda();
  // reset() vacía los campos después de este evento, por eso la fecha se carga un instante más tarde
  setTimeout(precargarFechaTurno, 0);
});

function editarTurno(id) {
  const turno = turnos.find((item) => item.id === id);
  if (!turno) return;

  limpiarErroresTurno();

  idTurnoEnEdicion = turno.id;
  campoTurno.id.value = turno.id;
  campoTurno.mascotaId.value = turno.mascotaId;
  campoTurno.fecha.value = turno.fecha;
  campoTurno.hora.value = turno.hora;
  campoTurno.motivo.value = turno.motivo;
  campoTurno.veterinario.value = turno.veterinario;

  actualizarBotonesFormTurno();
  irADia(turno.fecha); // también redibuja la agenda con la tarjeta resaltada

  formTurno.scrollIntoView({ behavior: "smooth", block: "start" });
  campoTurno.mascotaId.focus({ preventScroll: true });
}


/* ---------- Estados y baja ---------- */

function descripcionTurno(turno) {
  const mascota = mascotas.find((item) => item.id === turno.mascotaId);
  const nombre = mascota ? mascota.nombre : "la mascota";
  return `el turno de ${nombre} del ${fechaCorta(turno.fecha)} a las ${turno.hora}`;
}

function marcarAtendido(id) {
  const turno = turnos.find((item) => item.id === id);
  if (!turno || !turnoEstaPendiente(turno)) return;

  turno.estado = "Atendido";
  guardarOAvisar();
  renderAgenda();
}

function cancelarTurno(id) {
  const turno = turnos.find((item) => item.id === id);
  if (!turno || !turnoEstaPendiente(turno)) return;
  if (!confirm(`¿Cancelar ${descripcionTurno(turno)}?`)) return;

  turno.estado = "Cancelado";
  guardarOAvisar();
  renderAgenda();
}

function eliminarTurno(id) {
  const posicion = turnos.findIndex((item) => item.id === id);
  if (posicion === -1) return;
  const turno = turnos[posicion];

  if (!confirm(`¿Eliminar ${descripcionTurno(turno)}? Esta acción no se puede deshacer.`)) return;

  turnos.splice(posicion, 1);
  guardarOAvisar();

  if (idTurnoEnEdicion === id) {
    formTurno.reset(); // sale del modo edición y redibuja
  } else {
    renderAgenda();
  }
}

agendaTurnos.addEventListener("click", (evento) => {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton) return;

  const { accion, id } = boton.dataset;
  if (accion === "atendido") marcarAtendido(id);
  if (accion === "cancelar") cancelarTurno(id);
  if (accion === "editar") editarTurno(id);
  if (accion === "eliminar") eliminarTurno(id);
});


/* ==========================================================================
   PRIMERA CARGA
   renderDuenos() también arma los selects y dibuja mascotas y agenda.
   ========================================================================== */

actualizarBotonesFormTurno();
precargarFechaTurno();
renderDuenos();

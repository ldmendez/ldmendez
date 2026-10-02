/* ===== Menú móvil ===== */
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
burger.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  burger.setAttribute('aria-expanded', open);
});
nav.addEventListener('click', e => { if (e.target.tagName === 'A') nav.classList.remove('open'); });

/* ===== Almacenamiento local ===== */
const store = {
  get(k){ try { return localStorage.getItem(k); } catch { return null; } },
  set(k,v){ try { return localStorage.setItem(k,v) || true; } catch { return false; } }
};

/* ===== Imágenes de fondo (carpeta img/) ===== */
document.querySelectorAll('.photo').forEach(el => {
  el.style.setProperty('--photo', `url("${el.dataset.default}")`);
});

/* ===== Sistema de seguimiento con perfiles =====
   Prototipo académico: las credenciales están en el código, por lo que NO
   ofrece seguridad real. Para producción se necesita un servidor. */
const TRABAJADORES = [{ usuario:'tecnico', clave:'serviexpress2026', nombre:'Técnico ServiExpress' }];
const ESTADOS = ['Recibido', 'En reparación', 'Listo para entregar'];
const claseEstado = e => e === 'Recibido' ? 's-Recibido' : e === 'En reparación' ? 's-reparacion' : 's-Listo';
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $ = id => document.getElementById(id);
const limpiarTel = t => String(t).replace(/[\s-]/g, '');

let servicios = [];
try { servicios = JSON.parse(store.get('servicios') || '[]'); } catch { servicios = []; }
if (!servicios.length) {
  servicios = [
    { codigo:'SE-001', cliente:'María Fernández', telefono:'3001234567', tipo:'Celular', equipo:'Samsung A32', falla:'Pantalla rota', estado:'En reparación', fecha:'2026-09-28' },
    { codigo:'SE-002', cliente:'Carlos Pérez', telefono:'3109876543', tipo:'Computador', equipo:'HP Pavilion 15', falla:'No enciende', estado:'Recibido', fecha:'2026-09-30' },
    { codigo:'SE-003', cliente:'Institución Educativa Maicao', telefono:'3205551122', tipo:'Computador', equipo:'Lenovo ThinkPad', falla:'Mantenimiento preventivo', estado:'Listo para entregar', fecha:'2026-09-25' }
  ];
  guardar();
}
function pasos(estado){
  const idx = ESTADOS.indexOf(estado);
  return `<ol class="steps" aria-label="Progreso de la reparación">` +
    ESTADOS.map((e,i) => `<li class="${i < idx ? 'done' : i === idx ? 'now' : ''}">${e}</li>`).join('') + `</ol>`;
}
function guardar(){ store.set('servicios', JSON.stringify(servicios)); }
function siguienteCodigo(){
  const max = servicios.reduce((m, s) => Math.max(m, parseInt(s.codigo.split('-')[1]) || 0), 0);
  return 'SE-' + String(max + 1).padStart(3, '0');
}

/* Sesión (se borra al cerrar la pestaña) */
let sesion = null; // { rol:'trabajador'|'cliente', nombre, telefono }
try { sesion = JSON.parse(sessionStorage.getItem('sesion')); } catch { sesion = null; }
const guardarSesion = () => { try { sessionStorage.setItem('sesion', JSON.stringify(sesion)); } catch {} };

/* Pestañas del login */
let rolLogin = 'cliente';
function pintarLogin(){
  const t = rolLogin === 'trabajador';
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.rol === rolLogin));
  $('luser').textContent = t ? 'Usuario' : 'Teléfono registrado';
  $('lpass').textContent = t ? 'Contraseña' : 'Contraseña (código del servicio, ej. SE-001)';
  $('user').value = ''; $('pass').value = ''; $('lerr').textContent = '';
}
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => { rolLogin = b.dataset.rol; pintarLogin(); }));

$('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const u = $('user').value.trim(), p = $('pass').value.trim();
  if (rolLogin === 'trabajador') {
    const t = TRABAJADORES.find(x => x.usuario === u.toLowerCase() && x.clave === p);
    if (!t) { $('lerr').textContent = 'Usuario o contraseña incorrectos.'; return; }
    sesion = { rol:'trabajador', nombre:t.nombre };
  } else {
    const tel = limpiarTel(u);
    const ok = servicios.some(s => limpiarTel(s.telefono) === tel && s.codigo === p.toUpperCase());
    if (!ok) { $('lerr').textContent = 'No encontramos ese teléfono con ese código de servicio. Revísalos e inténtalo de nuevo.'; return; }
    sesion = { rol:'cliente', nombre:'Cliente', telefono:tel };
  }
  guardarSesion(); pintarVista();
});

$('salir').addEventListener('click', () => {
  sesion = null;
  try { sessionStorage.removeItem('sesion'); } catch {}
  pintarVista();
});

function pintarVista(){
  const dentro = !!sesion;
  $('login').hidden = dentro;
  $('panelApp').hidden = !dentro;
  $('vistaTrab').hidden = !(dentro && sesion.rol === 'trabajador');
  $('vistaCli').hidden = !(dentro && sesion.rol === 'cliente');
  if (!dentro) { pintarLogin(); return; }
  $('quien').textContent = sesion.rol === 'trabajador' ? 'Sesión de trabajador: ' + sesion.nombre : 'Sesión de cliente (solo consulta)';
  if (sesion.rol === 'trabajador') renderLista(); else renderCliente();
}

/* Vista del cliente: solo lectura */
function tarjetaCliente(s){
  return `<article class="item">
    <span class="code">${esc(s.codigo)}</span>
    <span class="badge ${claseEstado(s.estado)}">${esc(s.estado)}</span>
    ${pasos(s.estado)}
    <strong>${esc(s.tipo)}: ${esc(s.equipo)}</strong>
    <p>Falla reportada: ${esc(s.falla)}</p>
    <p>Ingreso: ${esc(s.fecha)}</p>
  </article>`;
}
function renderCliente(){
  if (!sesion || sesion.rol !== 'cliente') return;
  const mios = servicios.filter(s => limpiarTel(s.telefono) === sesion.telefono);
  $('miLista').innerHTML = mios.length ? mios.map(tarjetaCliente).join('') : '<p class="empty">No hay equipos registrados con este teléfono.</p>';
}

/* Vista del trabajador: gestión completa */
function renderStats(){
  const c = e => servicios.filter(s => s.estado === e).length;
  $('stats').innerHTML =
    `<div class="stat"><b>${servicios.length}</b><small>Total</small></div>` +
    ESTADOS.map(e => `<div class="stat"><b>${c(e)}</b><small>${e}</small></div>`).join('');
}
function tarjeta(s){
  return `<article class="item">
    <span class="code">${esc(s.codigo)}</span>
    <span class="badge ${claseEstado(s.estado)}">${esc(s.estado)}</span>
    ${pasos(s.estado)}
    <strong>${esc(s.cliente)}</strong>
    <p>${esc(s.tipo)}: ${esc(s.equipo)}</p>
    <p>Falla: ${esc(s.falla)}</p>
    <p>Tel. ${esc(s.telefono)} · Ingreso ${esc(s.fecha)}</p>
    <select data-cambiar="${esc(s.codigo)}" aria-label="Cambiar estado de ${esc(s.codigo)}">
      ${ESTADOS.map(e => `<option ${e === s.estado ? 'selected' : ''}>${e}</option>`).join('')}
    </select>
    <button class="del" data-borrar="${esc(s.codigo)}">Eliminar</button>
  </article>`;
}
function renderLista(){
  if (!sesion || sesion.rol !== 'trabajador') return;
  const q = $('buscar').value.trim().toLowerCase();
  const f = $('filtro').value;
  const lista = servicios.filter(s =>
    (!f || s.estado === f) &&
    (!q || [s.codigo, s.cliente, s.equipo, s.falla, s.telefono].join(' ').toLowerCase().includes(q)));
  $('lista').innerHTML = lista.length ? lista.slice().reverse().map(tarjeta).join('')
    : '<p class="empty">No hay servicios que coincidan. Registra una nueva solicitud o cambia la búsqueda.</p>';
  renderStats();
}

$('form').addEventListener('submit', e => {
  e.preventDefault();
  if (!sesion || sesion.rol !== 'trabajador') return;
  const d = Object.fromEntries(new FormData(e.target));
  if (['cliente','telefono','equipo','falla'].some(k => !d[k].trim())) { $('err').textContent = 'Completa todos los campos antes de registrar.'; return; }
  if (!/^[0-9+\s-]{7,20}$/.test(d.telefono.trim())) { $('err').textContent = 'Escribe un teléfono válido, solo con números.'; return; }
  $('err').textContent = '';
  const nuevo = { codigo: siguienteCodigo(), estado:'Recibido', fecha:new Date().toISOString().slice(0,10),
    cliente:d.cliente.trim(), telefono:d.telefono.trim(), tipo:d.tipo, equipo:d.equipo.trim(), falla:d.falla.trim() };
  servicios.push(nuevo); guardar(); e.target.reset(); renderLista();
  $('resultado').innerHTML = `<p>Solicitud registrada. Entrega al cliente su acceso: usuario <strong>${esc(nuevo.telefono)}</strong>, contraseña <strong>${nuevo.codigo}</strong>.</p>`;
});
$('lista').addEventListener('change', e => {
  const cod = e.target.dataset.cambiar;
  if (!cod || !sesion || sesion.rol !== 'trabajador') return;
  servicios.find(s => s.codigo === cod).estado = e.target.value;
  guardar(); renderLista();
});
$('lista').addEventListener('click', e => {
  const cod = e.target.dataset.borrar;
  if (!cod || !sesion || sesion.rol !== 'trabajador' || !confirm('¿Eliminar el servicio ' + cod + '?')) return;
  servicios = servicios.filter(s => s.codigo !== cod);
  guardar(); renderLista();
});
$('buscar').addEventListener('input', renderLista);
$('filtro').addEventListener('change', renderLista);

pintarVista();

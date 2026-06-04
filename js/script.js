// =============================================================================
// js/script.js  –  VET ECL · Navegación + Llamadas reales a la API
// =============================================================================

const API = 'proyecto-final-production-448f.up.railway.app'; 

// ── Helpers fetch ─────────────────────────────────────────────────────────────

async function apiGet(col, id = null) {
  const url = id ? `${API}?col=${col}&id=${id}` : `${API}?col=${col}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPost(col, data) {
  const res = await fetch(`${API}?col=${col}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Navegación (igual que antes + pushState) ─────────────────────────────────

function _render(state) {
  document.querySelectorAll('#pg-index, [id^="pg-"]').forEach(el => el.style.display = 'none');
  const pg = document.getElementById(state.pg);
  if (pg) { pg.style.display = 'block'; window.scrollTo(0, 0); }

  if (state.pg === 'pg-registros') {
    if (state.form) {
      document.getElementById('reg-index-pg').style.display = 'none';
      document.querySelectorAll('.reg-form-pg').forEach(f => f.style.display = 'none');
      const frm = document.getElementById('frm-' + state.form);
      if (frm) { frm.style.display = 'block'; }
    } else {
      showRegIndexOnly();
    }
  }
}

function showPg(id) {
  const state = { pg: id, form: null };
  history.pushState(state, '', '#' + id);
  _render(state);
}

function showRegIndex() {
  const state = { pg: 'pg-registros', form: null };
  history.pushState(state, '', '#pg-registros');
  _render(state);
}

function showRegIndexOnly() {
  document.getElementById('reg-index-pg').style.display = 'block';
  document.querySelectorAll('.reg-form-pg').forEach(f => f.style.display = 'none');
}

function showRegForm(nombre) {
  const state = { pg: 'pg-registros', form: nombre };
  history.pushState(state, '', '#reg-' + nombre);
  _render(state);
  // Al abrir un formulario, cargar su lista de registros existentes
  cargarLista(nombre);
}

window.addEventListener('popstate', e => {
  if (e.state) _render(e.state);
  else _render({ pg: 'pg-index', form: null });
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('pg-sitio').style.display    = 'none';
  document.getElementById('pg-registros').style.display = 'none';
  history.replaceState({ pg: 'pg-index', form: null }, '', '#pg-index');

  // Adjuntar submit handlers a cada formulario
  bindForm('cliente',     coleccionData_cliente);
  bindForm('mascota',     coleccionData_mascota);
  bindForm('veterinario', coleccionData_veterinario);
  bindForm('cita',        coleccionData_cita);
  bindForm('tratamiento', coleccionData_tratamiento);
  bindForm('factura',     coleccionData_factura);
});

// ── Mensaje de éxito / error ──────────────────────────────────────────────────

function showSuccess(btn, texto = null) {
  const msg = btn.parentElement.nextElementSibling;
  if (msg && msg.classList.contains('success-msg')) {
    if (texto) msg.textContent = texto;
    msg.style.display = 'block';
    msg.style.color   = 'var(--dorado)';
    msg.style.border  = '1px solid var(--dorado)';
    setTimeout(() => { msg.style.display = 'none'; }, 3500);
  }
}

function showError(btn, texto) {
  const msg = btn.parentElement.nextElementSibling;
  if (msg && msg.classList.contains('success-msg')) {
    msg.textContent = '✕ ' + texto;
    msg.style.display = 'block';
    msg.style.color   = '#dc5050';
    msg.style.border  = '1px solid #dc5050';
    setTimeout(() => { msg.style.display = 'none'; }, 4000);
  }
}

// ── Bind genérico: intercepta el botón Guardar ────────────────────────────────

function bindForm(nombre, dataFn) {
  const frm = document.getElementById('frm-' + nombre);
  if (!frm) return;
  const btn = frm.querySelector('.btn-reg-save');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const data = dataFn(frm);
    if (!data) return; // validación interna puede retornar null

    try {
      btn.disabled = true;
      btn.textContent = 'Guardando…';
      await apiPost(nombre + 's', data); // clientes, mascotas, etc.
      showSuccess(btn, '✓ Registrado correctamente.');
      frm.querySelectorAll('input, textarea').forEach(el => el.value = '');
      frm.querySelectorAll('select').forEach(el => el.selectedIndex = 0);
      frm.querySelectorAll('input[type=checkbox]').forEach(el => el.checked = false);
      await cargarLista(nombre); // refrescar tabla
    } catch (err) {
      showError(btn, 'Error al guardar: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar ' + capitalizar(nombre);
    }
  });
}

function capitalizar(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ── Lectores de formulario (devuelven objetos listos para la API) ─────────────

function coleccionData_cliente(frm) {
  const [id, nombre, tel, correo, dir, fecha, mascota] =
    frm.querySelectorAll('input, select, textarea');
  return {
    clienteId:       id.value.trim()     || generarId(),
    nombre:          nombre.value.trim(),
    telefono:        tel.value.trim(),
    correo:          correo.value.trim(),
    direccion:       dir.value.trim(),
    fechaDeRegistro: fecha.value,
    nombreMascota:   mascota.value.trim(),
  };
}

function coleccionData_mascota(frm) {
  const inputs   = frm.querySelectorAll('input:not([type=checkbox])');
  const selects  = frm.querySelectorAll('select');
  const checks   = frm.querySelectorAll('input[type=checkbox]');
  return {
    idMascota:       inputs[0].value.trim() || generarId(),
    idCliente:       inputs[1].value.trim(),
    animal:          selects[0].value,
    raza:            inputs[2].value.trim(),
    nombreMascota:   inputs[3].value.trim(),
    edad:            Number(inputs[4].value) || 0,
    peso:            inputs[5].value.trim(),
    atencion:        selects[1].value,
    fechaDeRegistro: inputs[6].value,
    numeroRegistro:  inputs[7].value.trim(),
    vacunas: {
      rabia:      checks[0].checked,
      parvovirus: checks[1].checked,
      moquillo:   checks[2].checked,
    },
  };
}

function coleccionData_veterinario(frm) {
  const inputs  = frm.querySelectorAll('input');
  const selects = frm.querySelectorAll('select');
  return {
    veterinarioId: inputs[0].value.trim() || generarId(),
    nombre:        inputs[1].value.trim(),
    especialidad:  selects[0].value,
    telefono:      inputs[2].value.trim(),
    correo:        inputs[3].value.trim(),
    rfc:           inputs[4].value.trim(),
    turno:         selects[1].value,
    diasLaborados: inputs[5].value.trim().split(''),
    horario:       inputs[6].value.trim(),
    direccion:     inputs[7].value.trim(),
    estado:        selects[2].value,
  };
}

function coleccionData_cita(frm) {
  const inputs = frm.querySelectorAll('input');
  return {
    idCita:        inputs[0].value.trim() || generarId(),
    fecha:         inputs[1].value,
    idMascota:     inputs[2].value.trim(),
    idVeterinario: inputs[3].value.trim(),
    registro:      inputs[4].value.trim(),
    hora:          inputs[5].value,
  };
}

function coleccionData_tratamiento(frm) {
  const inputs  = frm.querySelectorAll('input, textarea');
  const selects = frm.querySelectorAll('select');
  return {
    idTratamiento: inputs[0].value.trim() || generarId(),
    idMascota:     inputs[1].value.trim(),
    servicio:      selects[0].value,
    costo:         Number(inputs[2].value) || 0,
    descripcion:   inputs[3]?.value.trim() || '',
  };
}

function coleccionData_factura(frm) {
  const inputs = frm.querySelectorAll('input');
  const select = frm.querySelector('select');
  return {
    folio:         inputs[0].value.trim() || generarId(),
    pago:          Number(inputs[1].value) || 0,
    fechaHora:     inputs[2].value,
    trabajo:       select.value,
    idVeterinario: inputs[3].value.trim(),
    idMascota:     inputs[4].value.trim(),
    idCliente:     inputs[5].value.trim(),
    registro:      inputs[6].value.trim(),
  };
}

// ── Tabla de registros existentes ─────────────────────────────────────────────
// Se inyecta debajo del formulario para mostrar los datos ya guardados

async function cargarLista(nombre) {
  const frm = document.getElementById('frm-' + nombre);
  if (!frm) return;

  // Contenedor de la tabla (se crea si no existe)
  let tabla = frm.querySelector('.reg-tabla');
  if (!tabla) {
    tabla = document.createElement('div');
    tabla.className = 'reg-tabla';
    tabla.style.cssText = `
      margin-top:36px; border-top:1px solid var(--borde);
      padding-top:24px; overflow-x:auto;
    `;
    frm.querySelector('.reg-form-wrap').appendChild(tabla);
  }

  tabla.innerHTML = '<p style="color:var(--gris);font-size:.8rem;letter-spacing:1px">Cargando registros…</p>';

  try {
    const docs = await apiGet(nombre + 's');

    if (!docs.length) {
      tabla.innerHTML = '<p style="color:var(--gris);font-size:.8rem;">Sin registros aún.</p>';
      return;
    }

    // Construir tabla HTML dinámica
    const cols = Object.keys(docs[0]).filter(k => k !== '_id');
    const etiquetas = {
      clienteId:'ID', veterinarioId:'ID', idMascota:'ID', idCita:'ID',
      idTratamiento:'ID', folio:'Folio',
      nombre:'Nombre', nombreMascota:'Mascota', telefono:'Teléfono',
      correo:'Correo', especialidad:'Especialidad', turno:'Turno',
      estado:'Estado', animal:'Animal', raza:'Raza', edad:'Edad',
      peso:'Peso', atencion:'Atención', fecha:'Fecha', hora:'Hora',
      servicio:'Servicio', costo:'Costo', pago:'Pago', trabajo:'Trabajo',
      fechaHora:'Fecha/Hora', horario:'Horario',
    };

    // Solo mostrar columnas relevantes (máx. 7 para no saturar)
    const colsVis = cols.slice(0, 7);

    let html = `
      <div style="font-size:.6rem;letter-spacing:3px;text-transform:uppercase;
                  color:var(--dorado);margin-bottom:14px;">
        Registros existentes (${docs.length})
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:.8rem;">
        <thead>
          <tr style="border-bottom:1px solid var(--borde);">
            ${colsVis.map(c => `<th style="padding:8px 12px;text-align:left;
              color:var(--gris);font-size:.62rem;letter-spacing:2px;
              text-transform:uppercase;font-weight:400;">${etiquetas[c] || c}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
    `;

    docs.forEach((doc, i) => {
      const bg = i % 2 === 0 ? 'var(--card)' : 'transparent';
      html += `<tr style="background:${bg};border-bottom:1px solid var(--borde)20;">`;
      colsVis.forEach(c => {
        let val = doc[c];
        if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
        if (Array.isArray(val)) val = val.join(', ');
        html += `<td style="padding:9px 12px;color:var(--blanco);
                   max-width:160px;overflow:hidden;text-overflow:ellipsis;
                   white-space:nowrap;">${val ?? '—'}</td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table>';
    tabla.innerHTML = html;

  } catch (err) {
    tabla.innerHTML = `<p style="color:#dc5050;font-size:.8rem;">
      No se pudieron cargar los registros. ¿Está corriendo el servidor PHP?<br>
      <small style="opacity:.6">${err.message}</small></p>`;
  }
}

function generarId() {
  return Math.floor(Math.random() * 90000 + 10000).toString();
}

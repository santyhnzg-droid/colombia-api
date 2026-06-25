const BASE_URL    = 'https://api-colombia.com/api/v1';
const BACKEND_URL = 'http://localhost:3000';

let departamentoActual = null;
let apiDeptsPorNombre   = {};
let todasLasAtracciones = null; // cache: se piden una sola vez

function normalizar(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function slugify(text) {
  const s = normalizar(text || '');
  return s.replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
}

async function fetchConValidacion(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error ${response.status} al obtener: ${url}`);
  }
  return response.json();
}

function inicializarUI() {
  document.querySelectorAll('.circle').forEach(span => {
    const nombre = span.dataset.name || span.id;
    span.title = nombre;
    span.addEventListener('click', () => seleccionarDepartamentoPorNombre(nombre, span));
  });

  const modal = document.getElementById('attraction-modal');
  if (modal) {
    modal.setAttribute('hidden', '');
    document.getElementById('attraction-modal-close').onclick = cerrarModalAtraccion;
    modal.querySelector('.attraction-modal__backdrop').onclick = cerrarModalAtraccion;
  }

  const btnGuardar = document.getElementById('btn-guardar');
  if (btnGuardar) btnGuardar.addEventListener('click', guardarDepartamento);

  cargarDepartamentos();
}

async function cargarDepartamentos() {
  try {
    const apiDepts = await fetchConValidacion(`${BASE_URL}/Department`);
    apiDepts.forEach(d => {
      if (d && d.name) apiDeptsPorNombre[normalizar(d.name)] = d;
    });
  } catch (error) {
    console.error('Error al cargar la lista de departamentos:', error);
    mostrarMensajeAtracciones('No se pudo inicializar la lista de departamentos.');
  }
}

async function cargarTodasLasAtracciones() {
  if (todasLasAtracciones) return todasLasAtracciones;
  todasLasAtracciones = await fetchConValidacion(`${BASE_URL}/TouristicAttraction`);
  return todasLasAtracciones;
}

function seleccionarCirculo(elemento) {
  document.querySelectorAll('.circle').forEach(span => {
    span.classList.toggle('circle--selected', span === elemento);
  });
}

async function seleccionarDepartamentoPorNombre(nombre, elementoSeleccionado) {
  seleccionarCirculo(elementoSeleccionado);
  mostrarPanelCargando(nombre);

  const nombreNormalizado = normalizar(nombre);
  const dept = apiDeptsPorNombre[nombreNormalizado];

  if (dept && dept.id) {
    return seleccionarDepartamento(dept.id, dept.name);
  }

  try {
    const resultados = await fetchConValidacion(`${BASE_URL}/Department/search/${encodeURIComponent(nombre)}`);
    if (Array.isArray(resultados) && resultados.length > 0) {
      const deptEncontrado = resultados[0];
      apiDeptsPorNombre[nombreNormalizado] = deptEncontrado;
      return seleccionarDepartamento(deptEncontrado.id, deptEncontrado.name);
    }
    mostrarErrorPanel(`No se encontró información para "${nombre}".`);
    mostrarMensajeAtracciones(`No se encontró el departamento "${nombre}".`);
  } catch (error) {
    mostrarErrorPanel(`No se pudo cargar "${nombre}": ${error.message}`);
    mostrarMensajeAtracciones(`No se pudo cargar "${nombre}": ${error.message}`);
  }
}

async function seleccionarDepartamento(id, nombre) {
  // Atracciones (si el panel existe en esta página)
  if (document.getElementById('attractions-grid')) {
    mostrarAtraccionesDelDepartamento(id, nombre);
  }

  // Card de información del departamento (si existe en esta página)
  if (!document.getElementById('dept-nombre')) return;

  try {
    const [departamento, municipios] = await Promise.all([
      fetchConValidacion(`${BASE_URL}/Department/${id}`),
      fetchConValidacion(`${BASE_URL}/Department/${id}/cities`)
    ]);

    let regionNombre = 'N/A';
    if (departamento.regionId) {
      try {
        const region = await fetchConValidacion(`${BASE_URL}/Region/${departamento.regionId}`);
        regionNombre = region.name || 'N/A';
      } catch (error) {
        console.error('Error obteniendo región:', error);
      }
    }

    departamentoActual = {
      id: departamento.id,
      nombre: departamento.name || nombre,
      descripcion: departamento.description || 'Sin descripción disponible.',
      region: regionNombre,
      superficie: departamento.surface != null ? departamento.surface.toLocaleString('es-CO') : 'N/A',
      poblacion: departamento.population != null ? departamento.population.toLocaleString('es-CO') : 'N/A',
      municipios: Array.isArray(municipios) ? municipios.map(m => m.name) : []
    };

    mostrarInfoDepartamento(departamentoActual);
  } catch (error) {
    console.error('Error al cargar departamento:', error);
    mostrarErrorPanel(`No se pudo cargar la información de ${nombre}. ${error.message}`);
  }
}

function cargarImagenDepartamento(dept) {
  const imgEl = document.querySelector('.image-department');
  if (!imgEl) return;
  imgEl.style.display = 'none';

  const base = slugify(dept && dept.nombre ? dept.nombre : dept && dept.id ? String(dept.id) : '');
  if (!base) {
    imgEl.removeAttribute('src');
    return;
  }

  const exts = ['webp', 'jpg', 'png', 'jpeg'];
  let idx = 0;

  function intentar() {
    if (idx >= exts.length) {
      imgEl.removeAttribute('src');
      imgEl.style.display = 'none';
      return;
    }
    const url = `img/${base}.${exts[idx]}`;
    const tester = new Image();
    tester.onload = () => {
      imgEl.src = url;
      imgEl.style.display = 'block';
    };
    tester.onerror = () => {
      idx += 1;
      intentar();
    };
    tester.src = url;
  }

  intentar();
}

function mostrarPanelCargando(nombre) {
  if (!document.getElementById('dept-nombre')) return;
  document.getElementById('dept-nombre').textContent           = nombre;
  document.getElementById('dept-region').textContent           = 'Cargando...';
  document.getElementById('dept-descripcion').textContent      = '';
  document.getElementById('dept-superficie').textContent       = '…';
  document.getElementById('dept-poblacion').textContent        = '…';
  document.getElementById('dept-municipios-count').textContent = '…';
  ocultarMensaje();
  const btn = document.getElementById('btn-guardar');
  if (btn) btn.disabled = true;

  const imgEl = document.querySelector('.image-department');
  if (imgEl) {
    imgEl.style.display = 'none';
    imgEl.removeAttribute('src');
  }
}

function mostrarInfoDepartamento(dept) {
  document.getElementById('dept-nombre').textContent           = dept.nombre;
  document.getElementById('dept-region').textContent           = dept.region;
  document.getElementById('dept-descripcion').textContent      = dept.descripcion;
  document.getElementById('dept-superficie').textContent       = dept.superficie;
  document.getElementById('dept-poblacion').textContent        = dept.poblacion;
  document.getElementById('dept-municipios-count').textContent = dept.municipios.length;
  ocultarMensaje();
  const btn = document.getElementById('btn-guardar');
  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Guardar departamento';
  }

  try {
    cargarImagenDepartamento(dept);
  } catch (e) {
    console.error('Error cargando imagen:', e);
  }
}

function mostrarErrorPanel(mensaje) {
  if (!document.getElementById('dept-descripcion')) return;
  document.getElementById('dept-descripcion').textContent = '';
  mostrarMensaje(mensaje, 'error');
  const btn = document.getElementById('btn-guardar');
  if (btn) btn.disabled = true;
}

async function guardarDepartamento(evento) {
  evento.preventDefault();
  if (!departamentoActual) return;

  const btn = document.getElementById('btn-guardar');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    const response = await fetch(`${BACKEND_URL}/guardar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(departamentoActual),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error ${response.status}`);
    }

    const resultado = await response.json();
    mostrarMensaje(`✅ ${resultado.mensaje}`, 'exito');
    btn.textContent = 'Guardado ✓';
  } catch (error) {
    console.error('Error al guardar:', error);
    mostrarMensaje(`❌ No se pudo guardar: ${error.message}`, 'error');
    btn.disabled = false;
    btn.textContent = 'Guardar departamento';
  }
}

function mostrarMensaje(texto, tipo) {
  const el = document.getElementById('mensaje');
  if (!el) return;
  el.textContent = texto;
  el.className = `mensaje ${tipo}`;
  el.hidden = false;
}

function ocultarMensaje() {
  const el = document.getElementById('mensaje');
  if (!el) return;
  el.hidden = true;
  el.textContent = '';
}

async function mostrarAtraccionesDelDepartamento(departmentId, nombreDept) {
  const titulo = document.getElementById('attractions-title');
  if (titulo) titulo.textContent = `Atracciones en ${nombreDept}`;
  mostrarMensajeAtracciones('Cargando atracciones…');

  try {
    const [ciudades, atracciones] = await Promise.all([
      fetchConValidacion(`${BASE_URL}/Department/${departmentId}/cities`),
      cargarTodasLasAtracciones()
    ]);

    const idsCiudadesDept = new Set((ciudades || []).map(c => c.id));
    const filtradas = (atracciones || []).filter(a => idsCiudadesDept.has(a.cityId));

    renderAtracciones(filtradas);
  } catch (error) {
    console.error('Error al cargar atracciones:', error);
    mostrarMensajeAtracciones(`No se pudieron cargar las atracciones de ${nombreDept}.`);
  }
}

function renderAtracciones(lista) {
  const grid = document.getElementById('attractions-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (!lista || lista.length === 0) {
    grid.innerHTML = '<p class="placeholder">No se encontraron atracciones para este departamento.</p>';
    return;
  }

  lista.forEach(atraccion => {
    const card = document.createElement('div');
    card.className = 'attraction-card';

    const img = document.createElement('img');
    img.src = (atraccion.images && atraccion.images[0]) || 'img/placeholder.png';
    img.alt = atraccion.name || '';

    const h4 = document.createElement('h4');
    h4.textContent = atraccion.name || 'Sin título';

    card.appendChild(img);
    card.appendChild(h4);
    card.addEventListener('click', () => abrirModalAtraccion(atraccion));
    grid.appendChild(card);
  });
}

function abrirModalAtraccion(atraccion) {
  const modal = document.getElementById('attraction-modal');
  if (!modal) return;

  document.getElementById('attraction-modal-title').textContent = atraccion.name || '';
  document.getElementById('attraction-modal-description').textContent =
    atraccion.description || 'Sin descripción disponible.';

  const imgEl = document.getElementById('attraction-modal-image');
  const url = atraccion.images && atraccion.images[0];
  if (url) {
    imgEl.src = url;
    imgEl.style.display = 'block';
  } else {
    imgEl.removeAttribute('src');
    imgEl.style.display = 'none';
  }

  modal.removeAttribute('hidden');
}

function cerrarModalAtraccion() {
  const modal = document.getElementById('attraction-modal');
  if (modal) modal.setAttribute('hidden', '');
}

function mostrarMensajeAtracciones(texto) {
  const grid = document.getElementById('attractions-grid');
  if (grid) grid.innerHTML = `<p class="placeholder">${texto}</p>`;
}

document.addEventListener('DOMContentLoaded', inicializarUI);
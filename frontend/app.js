const BASE_URL    = 'https://api-colombia.com/api/v1';
const BACKEND_URL = 'http://localhost:3000';




let departamentoActual = null;
let apiDeptsPorNombre  = {};

function normalizar(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
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

  document.getElementById('btn-guardar')
    .addEventListener('click', guardarDepartamento);

  cargarDepartamentos();
}

async function cargarDepartamentos() {
  try {
    const apiDepts = await fetchConValidacion(`${BASE_URL}/Department`);
    apiDepts.forEach(d => {
      if (d && d.name) {
        apiDeptsPorNombre[normalizar(d.name)] = d;
      }
    });
  } catch (error) {
    console.error('Error al cargar la lista de departamentos:', error);
    mostrarMensaje('No se pudo inicializar la lista de departamentos. Intenta de nuevo más tarde.', 'error');
  }
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
  } catch (error) {
    mostrarErrorPanel(`No se pudo cargar "${nombre}": ${error.message}`);
  }
}

async function seleccionarDepartamento(id, nombre) {
  mostrarPanelCargando(nombre);

  try {
    const [departamento, municipios] = await Promise.all([
      fetchConValidacion(`${BASE_URL}/Department/${id}`),
      fetchConValidacion(`${BASE_URL}/Department/${id}/cities`)
    ]);

    console.log('Departamento recibido:', departamento);

    let regionNombre = 'N/A';

    try {
      if (departamento.regionId) {
        const region = await fetchConValidacion(
          `${BASE_URL}/Region/${departamento.regionId}`
        );

        console.log('Región recibida:', region);

        regionNombre = region.name || 'N/A';
      }
    } catch (error) {
      console.error('Error obteniendo región:', error);
    }

    departamentoActual = {
      id: departamento.id,
      nombre: departamento.name || nombre,
      descripcion:
        departamento.description || 'Sin descripción disponible.',
      region: regionNombre,
      superficie:
        departamento.surface != null
          ? departamento.surface.toLocaleString('es-CO')
          : 'N/A',
      poblacion:
        departamento.population != null
          ? departamento.population.toLocaleString('es-CO')
          : 'N/A',
      municipios: Array.isArray(municipios)
        ? municipios.map(m => m.name)
        : []
    };

    mostrarInfoDepartamento(departamentoActual);

  } catch (error) {
    console.error('Error al cargar departamento:', error);

    mostrarErrorPanel(
      `No se pudo cargar la información de ${nombre}. ${error.message}`
    );
  }
}

function mostrarInfoDepartamento(dept) {
  document.getElementById('dept-nombre').textContent      = dept.nombre;
  document.getElementById('dept-region').textContent      = dept.region;
  document.getElementById('dept-descripcion').textContent = dept.descripcion;
  document.getElementById('dept-superficie').textContent  = dept.superficie;
  document.getElementById('dept-poblacion').textContent   = dept.poblacion;
  document.getElementById('dept-municipios-count').textContent = dept.municipios.length;

  const listaEl  = document.getElementById('municipios-lista');
  const estadoEl = document.getElementById('municipios-estado');

  listaEl.innerHTML = '';
  if (dept.municipios.length === 0) {
    estadoEl.hidden = false;
    estadoEl.textContent = 'No hay municipios disponibles.';
    listaEl.hidden = true;
  } else {
    estadoEl.hidden = true;
    listaEl.hidden = false;
    dept.municipios.forEach(nombre => {
      const li = document.createElement('li');
      li.textContent = nombre;
      listaEl.appendChild(li);
    });
  }

  ocultarMensaje();
  const btn = document.getElementById('btn-guardar');
  btn.disabled = false;
  btn.textContent = 'Guardar departamento';
}

function mostrarPanelCargando(nombre) {
  document.getElementById('dept-nombre').textContent           = nombre;
  document.getElementById('dept-region').textContent           = 'Cargando...';
  document.getElementById('dept-descripcion').textContent      = '';
  document.getElementById('dept-superficie').textContent       = '…';
  document.getElementById('dept-poblacion').textContent        = '…';
  document.getElementById('dept-municipios-count').textContent = '…';

  document.getElementById('municipios-estado').hidden      = false;
  document.getElementById('municipios-estado').textContent = 'Cargando municipios...';
  document.getElementById('municipios-lista').hidden       = true;

  ocultarMensaje();
  document.getElementById('btn-guardar').disabled = true;
}

function mostrarErrorPanel(mensaje) {
  document.getElementById('dept-descripcion').textContent = '';
  mostrarMensaje(mensaje, 'error');
  document.getElementById('btn-guardar').disabled = true;
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

document.addEventListener('DOMContentLoaded', () => {
  inicializarUI();
}); 
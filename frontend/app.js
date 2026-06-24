const BASE_URL    = 'https://api-colombia.com/api/v1';
const BACKEND_URL = 'http://localhost:3000';
const GEOJSON_URL =
  'https://gist.githubusercontent.com/john-guerra/43c7656821069d00dcbc/raw/be6a6e239cd5b5b803c6e7c2ec405b793a9064dd/Colombia.geo.json';

let mapa;
let capaDepartamentos;
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

function nombreDesdePropiedades(props) {
  return props.NOMBRE_DPT
      || props.nombre
      || props.DPTO_CNMBR
      || props.name
      || props.NAME
      || props.NOMBRE
      || '';
}

async function fetchConValidacion(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error ${response.status} al obtener: ${url}`);
  }
  return response.json();
}

function inicializarMapa() {
  mapa = L.map('mapa', {
    center: [4.5709, -74.2973],
    zoom: 5,
    zoomControl: true,
  });

  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }
  ).addTo(mapa);
}


async function cargarDepartamentos() {
  mostrarCargandoMapa(true);
  try {
    const [apiDepts, geojsonData] = await Promise.all([
      fetchConValidacion(`${BASE_URL}/Department`),
      fetchConValidacion(GEOJSON_URL),
    ]);
    apiDepts.forEach(d => {
      apiDeptsPorNombre[normalizar(d.name)] = d;
    });
    dibujarDepartamentosEnMapa(geojsonData);
  } catch (error) {
    console.error('Error al cargar departamentos:', error);
    mostrarErrorMapa(
      'No se pudieron cargar los departamentos. Verifica tu conexión y recarga.'
    );
  } finally {
    mostrarCargandoMapa(false);
  }
}

function dibujarDepartamentosEnMapa(geojsonData) {
  capaDepartamentos = L.geoJSON(geojsonData, {
    style: estiloPoligono,
    onEachFeature: (feature, layer) => {
      const nombreGeo = nombreDesdePropiedades(feature.properties);
      const apiDept   = apiDeptsPorNombre[normalizar(nombreGeo)];

      layer.bindTooltip(nombreGeo || 'Departamento', {
        permanent: false,
        sticky: true,
      });

      layer.on('click', () => {
        if (apiDept) {
          seleccionarDepartamento(apiDept.id, apiDept.name, layer);
        } else {
          seleccionarDepartamentoPorNombre(nombreGeo, layer);
        }
      });

      layer.on('mouseover', () => {
        if (!layer._seleccionado) {
          layer.setStyle({ fillColor: '#4CAF50', fillOpacity: 0.5 });
        }
      });
      layer.on('mouseout', () => {
        if (!layer._seleccionado) {
          layer.setStyle(estiloPoligono());
        }
      });
    },
  }).addTo(mapa);

  if (capaDepartamentos.getBounds().isValid()) {
    mapa.fitBounds(capaDepartamentos.getBounds(), { padding: [20, 20] });
  }
}

function estiloPoligono() {
  return {
    fillColor:   '#2E7D32',
    fillOpacity: 0.30,
    color:       '#1B5E20',
    weight:      1.5,
    opacity:     0.8,
  };
}

function estiloSeleccionado() {
  return {
    fillColor:   '#F9A825',
    fillOpacity: 0.55,
    color:       '#E65100',
    weight:      2.5,
    opacity:     1,
  };
}

async function seleccionarDepartamentoPorNombre(nombre, capaSeleccionada) {
  mostrarPanelCargando(nombre);
  try {
    const resultados = await fetchConValidacion(
      `${BASE_URL}/Department/search/${encodeURIComponent(nombre)}`
    );
    if (resultados && resultados.length > 0) {
      const dept = resultados[0];
      apiDeptsPorNombre[normalizar(nombre)] = dept; // cachear
      seleccionarDepartamento(dept.id, dept.name, capaSeleccionada);
    } else {
      mostrarErrorPanel(`No se encontró información para "${nombre}".`);
    }
  } catch (error) {
    mostrarErrorPanel(`No se pudo cargar "${nombre}": ${error.message}`);
  }
}

// ============================================================
// Seleccionar departamento: resetear estilos y cargar datos
// ============================================================
async function seleccionarDepartamento(id, nombre, capaSeleccionada) {
  // Resetear todos los estilos
  if (capaDepartamentos) {
    capaDepartamentos.eachLayer(layer => {
      layer._seleccionado = false;
      layer.setStyle(estiloPoligono());
    });
  }

  capaSeleccionada._seleccionado = true;
  capaSeleccionada.setStyle(estiloSeleccionado());
  mostrarPanelCargando(nombre);

  try {
    // Promise.all: departamento y municipios en paralelo
    const [departamento, municipios] = await Promise.all([
      fetchConValidacion(`${BASE_URL}/Department/${id}`),
      fetchConValidacion(`${BASE_URL}/Department/${id}/cities`),
    ]);

    departamentoActual = {
      id:          departamento.id,
      nombre:      departamento.name,
      descripcion: departamento.description  || 'Sin descripción disponible.',
      region:      departamento.regionName   || departamento.region?.name || 'N/A',
      superficie:  departamento.surface      != null
                     ? departamento.surface.toLocaleString('es-CO') : 'N/A',
      poblacion:   departamento.population   != null
                     ? departamento.population.toLocaleString('es-CO') : 'N/A',
      municipios:  municipios.map(m => m.name),
    };

    mostrarInfoDepartamento(departamentoActual);

  } catch (error) {
    console.error('Error al cargar departamento:', error);
    mostrarErrorPanel(
      `No se pudo cargar la información de ${nombre}. ${error.message}`
    );
  }
}

// ============================================================
// Renderizar información en el panel
// ============================================================
function mostrarInfoDepartamento(dept) {
  document.getElementById('panel-vacio').hidden     = true;
  document.getElementById('panel-contenido').hidden = false;

  document.getElementById('dept-nombre').textContent      = dept.nombre;
  document.getElementById('dept-region').textContent      = dept.region;
  document.getElementById('dept-descripcion').textContent = dept.descripcion;
  document.getElementById('dept-superficie').textContent  = dept.superficie;
  document.getElementById('dept-poblacion').textContent   = dept.poblacion;
  document.getElementById('dept-municipios-count').textContent = dept.municipios.length;

  const listaEl  = document.getElementById('municipios-lista');
  const estadoEl = document.getElementById('municipios-estado');

  listaEl.innerHTML = '';
  estadoEl.hidden   = true;
  listaEl.hidden    = false;

  dept.municipios.forEach(nombre => {
    const li       = document.createElement('li');
    li.textContent = nombre;
    listaEl.appendChild(li);
  });

  ocultarMensaje();
  const btn      = document.getElementById('btn-guardar');
  btn.disabled   = false;
  btn.textContent = 'Guardar departamento';
}

function mostrarPanelCargando(nombre) {
  document.getElementById('panel-vacio').hidden     = true;
  document.getElementById('panel-contenido').hidden = false;

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

// ============================================================
// Guardar en el backend con fetch POST
// ============================================================
async function guardarDepartamento(evento) {
  evento.preventDefault();

  if (!departamentoActual) return;

  const btn       = document.getElementById('btn-guardar');
  btn.disabled    = true;
  btn.textContent = 'Guardando...';

  try {
    const response = await fetch(`${BACKEND_URL}/guardar`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(departamentoActual),
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
    btn.disabled    = false;
    btn.textContent = 'Guardar departamento';
  }
}

// ============================================================
// Utilidades
// ============================================================
function mostrarMensaje(texto, tipo) {
  const el       = document.getElementById('mensaje');
  el.textContent = texto;
  el.className   = `mensaje ${tipo}`;
  el.hidden      = false;
}

function ocultarMensaje() {
  const el  = document.getElementById('mensaje');
  el.hidden = true;
  el.textContent = '';
}

function mostrarCargandoMapa(activo) {
  const contenedor = document.querySelector('.mapa-contenedor');
  let overlay      = document.getElementById('overlay-carga');
  if (activo) {
    if (!overlay) {
      overlay           = document.createElement('div');
      overlay.id        = 'overlay-carga';
      overlay.className = 'mapa-cargando';
      overlay.innerHTML =
        '<div class="spinner"></div><span>Cargando mapa de Colombia...</span>';
      contenedor.appendChild(overlay);
    }
  } else {
    if (overlay) overlay.remove();
  }
}

function mostrarErrorMapa(mensaje) {
  const contenedor    = document.querySelector('.mapa-contenedor');
  let overlay         = document.getElementById('overlay-carga');
  if (overlay) overlay.remove();
  const el            = document.createElement('div');
  el.className        = 'mapa-cargando';
  el.style.background = 'rgba(255,235,238,0.95)';
  el.style.color      = '#C62828';
  el.innerHTML        =
    `<span style="font-size:2rem">⚠️</span><span>${mensaje}</span>`;
  contenedor.appendChild(el);
}

// ============================================================
// DOMContentLoaded — punto de entrada
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  inicializarMapa();
  cargarDepartamentos();
  document.getElementById('btn-guardar')
    .addEventListener('click', guardarDepartamento);
}); 
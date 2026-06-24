const http = require('http');

const PORT = 3000;

class Departamento {
  constructor(datos) {
    this.id          = datos.id;
    this.nombre      = datos.nombre;
    this.descripcion = datos.descripcion;
    this.region      = datos.region;
    this.superficie  = datos.superficie;
    this.poblacion   = datos.poblacion;
    this.municipios  = datos.municipios;
    this.guardadoEn  = new Date().toISOString();
  }
  resumen() {
    return `[${this.guardadoEn}] Departamento guardado: ${this.nombre} (ID: ${this.id}) | Región: ${this.region}`;
  }
}

class Almacen {
  constructor() {
    this.departamentos = [];
  }

  guardar(datosDepartamento) {
    const dept = new Departamento(datosDepartamento);
    this.departamentos.push(dept);
    console.log('✅ ' + dept.resumen());
    console.log('   Total guardados:', this.departamentos.length);
    return dept;
  }

  listar() {
    return this.departamentos;
  }
}

const almacen = new Almacen();

function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function leerBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('JSON inválido en el body'));
      }
    });
    req.on('error', reject);
  });
}


const server = http.createServer(async (req, res) => {
  setCORSHeaders(res);

  // Manejo de preflight CORS (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ mensaje: 'Servidor activo 🇨🇴', guardados: almacen.listar().length }));
    return;
  }

  if (req.method === 'GET' && req.url === '/guardados') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(almacen.listar()));
    return;
  }

  if (req.method === 'POST' && req.url === '/guardar') {
    try {
      const datos = await leerBody(req);

      if (!datos.nombre) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'El campo "nombre" es obligatorio' }));
        return;
      }

      const departamentoGuardado = almacen.guardar(datos);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        mensaje: `Departamento "${departamentoGuardado.nombre}" guardado correctamente`,
        departamento: departamentoGuardado
      }));

    } catch (error) {
      console.error(' Error al guardar:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Error interno del servidor: ' + error.message }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
});


server.listen(PORT, () => {
  console.log('🇨🇴 Servidor corriendo en http://localhost:' + PORT);
  console.log('   Rutas disponibles:');
  console.log('   GET  /           → estado del servidor');
  console.log('   GET  /guardados  → lista de departamentos guardados');
  console.log('   POST /guardar    → guardar un departamento');
});

server.on('error', (error) => {
  console.error(' Error al iniciar el servidor:', error.message);
});
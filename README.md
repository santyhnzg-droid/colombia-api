# 🇨🇴 ColombiAPI — Mapa Interactivo de Colombia

Aplicación web interactiva que permite explorar los 32 departamentos de Colombia, ver sus datos, atracciones turísticas y guardarlos en un servidor local.

---

## 📁 Estructura del proyecto

```
proyecto/
├── frontend/
│   ├── index.html          → Página principal (info de departamentos)
│   ├── atracciones.html    → Página de atracciones turísticas
│   ├── style.css           → Estilos de toda la aplicación
│   ├── app.js              → Lógica del frontend
│   └── img/                → Imágenes de departamentos y placeholder
└── backend/
    └── server.js           → Servidor Node.js (sin frameworks)
```

---

## 🚀 Cómo ejecutar el proyecto

### 1. Iniciar el backend

```bash
cd backend
node server.js
```

Verás en la terminal:
```
🇨🇴 Servidor corriendo en http://localhost:3000
   GET  /           → estado del servidor
   GET  /guardados  → lista de departamentos guardados
   POST /guardar    → guardar un departamento
```

### 2. Abrir el frontend

Abre `frontend/index.html` directamente en tu navegador, o usa Live Server en VSCode.

> ⚠️ El backend debe estar corriendo para que el botón "Guardar departamento" funcione.

---

## 🌐 API utilizada

**[API Colombia](https://api-colombia.com/)** — API pública y gratuita con datos oficiales de Colombia.

| Endpoint | Descripción |
|---|---|
| `GET /Department` | Lista los 32 departamentos |
| `GET /Department/{id}` | Detalle de un departamento |
| `GET /Department/{id}/cities` | Municipios del departamento |
| `GET /Department/search/{nombre}` | Buscar departamento por nombre |
| `GET /Region/{id}` | Nombre de la región |
| `GET /TouristicAttraction` | Todas las atracciones turísticas |

Base URL: `https://api-colombia.com/api/v1`

---

## 🖥️ Páginas

### `index.html` — Departamentos
- Mapa SVG de Colombia con 32 círculos interactivos posicionados sobre cada departamento.
- Al hacer clic en un círculo se carga en el panel lateral: nombre, región, descripción, superficie, población y número de municipios.
- Muestra una foto del departamento (si existe en `/img/`).
- Botón para guardar el departamento seleccionado en el servidor.

### `atracciones.html` — Atracciones turísticas
- Mismo mapa con los 32 círculos.
- Al hacer clic en un departamento se muestra un grid con sus atracciones turísticas.
- Cada atracción abre un modal con imagen y descripción detallada.

---

## ⚙️ Backend — `server.js`

Servidor HTTP construido **únicamente con el módulo nativo `http` de Node.js**, sin frameworks externos.

### Rutas disponibles

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/` | Estado del servidor y total de guardados |
| `GET` | `/guardados` | Lista todos los departamentos guardados |
| `POST` | `/guardar` | Guarda un departamento en memoria |

### Clases (POO)

- **`Departamento`** — Representa un departamento guardado. Almacena todos sus campos y la fecha exacta en que fue guardado.
- **`Almacen`** — Gestiona la lista en memoria. Métodos: `guardar()` y `listar()`.

---

## ✅ Criterios de la rúbrica cubiertos

| Criterio | Implementación |
|---|---|
| **Eventos del DOM** | `DOMContentLoaded`, `click` en círculos, `click` en botón con `preventDefault`, clic en modal |
| **Fetch + API** | `BASE_URL` como constante, `fetchConValidacion()` con `response.ok`, múltiples endpoints |
| **Async / Await** | 100% `async/await`, sin `.then()` mezclado |
| **Promesas y errores** | `try/catch` en cada función de red, `Promise.all()` para peticiones paralelas, errores visibles en la UI |
| **Node.js sin frameworks** | Solo módulo `http` nativo, CORS manual, rutas GET y POST, imprime en terminal, almacena en memoria |
| **POO** | Clase `Departamento` con constructor y método `resumen()`, clase `Almacen` con `guardar()` y `listar()` |
| **Integración frontend-backend** | `fetch POST` desde el botón → servidor guarda → frontend muestra confirmación |

---

## 🛠️ Tecnologías

- **Frontend:** HTML5, CSS3, JavaScript (ES2020+)
- **Backend:** Node.js puro (módulo `http` nativo)
- **API:** [api-colombia.com](https://api-colombia.com/)
- **Sin frameworks ni librerías externas**

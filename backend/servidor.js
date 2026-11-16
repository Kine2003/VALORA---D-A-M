import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { pathToFileURL } from "node:url";
import { comprobarConexion, conectar } from "./datos/mysql.js";
import { productos, servicios } from "./modelos/catalogo.js";
import { cotizar, guardarPedido } from "./servicios/solicitudes.js";
import { SolicitudInvalida } from "./modelos/solicitud-invalida.js";
import { json } from "./middleware/json.js";
import { atenderApi } from "./rutas/api.js";

const frontend = new URL("../frontend/", import.meta.url);
const paginas = new Set(["/index.html", "/condiciones.html", "/privacidad.html"]);
const tipos = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".jpg": "image/jpeg", ".png": "image/png",
  ".svg": "image/svg+xml", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8",
};

async function servirArchivo(ruta, respuesta, cabeceras) {
  const tipo = tipos[extname(ruta)];
  if (!tipo || (!paginas.has(ruta) && !/^\/(?:assets|js)\/[a-zA-Z0-9_./-]+$/.test(ruta)) || ruta.includes("..")) {
    return json(respuesta, 404, { error: "Recurso no encontrado." });
  }
  try {
    const esPagina = paginas.has(ruta);
    let archivo = await readFile(new URL(ruta.slice(1), frontend), esPagina ? "utf8" : undefined);
    if (esPagina) {
      archivo = archivo.replace("<head>", '<head>\n    <meta name="valora-api" content="local">');
    }
    respuesta.writeHead(200, { "Content-Type": tipo });
    respuesta.end(cabeceras ? undefined : archivo);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") return json(respuesta, 404, { error: "Recurso no encontrado." });
    throw error;
  }
}

export function crearServidor(serviciosApi) {
  return createServer(async (peticion, respuesta) => {
    respuesta.setHeader("X-Content-Type-Options", "nosniff");
    try {
      if (!/^(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(peticion.headers.host || "")) {
        return json(respuesta, 403, { error: "Usa la dirección local del servidor." });
      }
      const ruta = new URL(peticion.url, "http://127.0.0.1").pathname;
      if (await atenderApi(peticion, respuesta, ruta, serviciosApi)) return;
      if (peticion.method === "GET" || peticion.method === "HEAD") {
        return await servirArchivo(ruta === "/" ? "/index.html" : ruta, respuesta, peticion.method === "HEAD");
      }
      return json(respuesta, 404, { error: "Ruta no encontrada." });
    } catch (error) {
      if (error instanceof SolicitudInvalida) return json(respuesta, 400, { error: error.message });
      console.error("Error del servidor:", error.code || error.name);
      return json(respuesta, 500, { error: "No se pudo completar la operación. Intenta nuevamente." });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const pool = conectar();
  const salud = () => comprobarConexion(pool);
  try {
    await salud();
    const servidor = crearServidor({
      salud, servicios: () => servicios(pool), productos: () => productos(pool),
      cotizar: datos => cotizar(pool, datos),
      guardarPedido: (contacto, lineas) => guardarPedido(pool, contacto, lineas),
    });
    const puerto = Number(process.env.PORT || 3000);
    servidor.on("error", async error => {
      console.error("No se pudo iniciar el servidor:", error.code || error.name);
      await pool.end();
      process.exitCode = 1;
    });
    servidor.listen(puerto, "127.0.0.1", () => console.log("Válora en http://127.0.0.1:" + puerto + "/"));
  } catch (error) {
    console.error("No se pudo conectar a MySQL:", error.code || error.name);
    await pool.end();
    process.exitCode = 1;
  }
}

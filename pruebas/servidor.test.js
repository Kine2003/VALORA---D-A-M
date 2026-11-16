import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import { crearServidor } from "../backend/servidor.js";

test("el servidor local activa la API en la página y sirve el catálogo del modelo", async t => {
  const datos = { version: 2, productos: [{ id: "desde-mysql" }] };
  const servidor = crearServidor({ productos: async () => datos });
  t.after(() => servidor.close());
  servidor.listen(0, "127.0.0.1");
  await once(servidor, "listening");
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const pagina = await fetch(base);
  assert.equal(pagina.status, 200);
  assert.match(await pagina.text(), /name="valora-api"/);
  const catalogo = await fetch(base + "/api/v1/productos");
  assert.equal(catalogo.status, 200);
  assert.deepEqual(await catalogo.json(), datos);
  assert.deepEqual(await (await fetch(base + "/data/productos.json")).json(), datos);
  const version = await fetch(base + "/api/v2/productos");
  assert.equal(version.status, 404);
  assert.match((await version.json()).error, /versión/i);
  const metodo = await fetch(base + "/api/v1/productos", { method: "POST" });
  assert.equal(metodo.status, 405);
  assert.equal(metodo.headers.get("allow"), "GET");
  const cotizacion = await fetch(base + "/api/v1/cotizaciones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(cotizacion.status, 400);
  assert.match((await cotizacion.json()).error, /datos/i);
  assert.equal((await fetch(base + "/.env")).status, 404);
});

export const servidorLocal = () => Boolean(globalThis.document?.querySelector('meta[name="valora-api"]'));

export function urlApi(recurso) {
  return new URL("../api/v1/" + recurso, import.meta.url);
}

export async function registrarSolicitud(tipo, datos) {
  const respuesta = await fetch(urlApi(tipo), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  const resultado = await respuesta.json();
  if (!respuesta.ok) throw new Error(resultado.error || "No se pudo registrar la solicitud.");
  return resultado;
}

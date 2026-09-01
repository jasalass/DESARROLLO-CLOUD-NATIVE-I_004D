// Datos de ejemplo en memoria, con la misma forma exacta que los JSON documentados en cada README de
// microservicio. Sirven solo para que la app sea usable localmente antes de que existan los backends reales.

export const lotes = [
  {
    id: "c4a1f900-0000-4000-8000-000000000001",
    martilleroSub: "d81fa021-0000-4000-8000-000000000001",
    titulo: "Reloj antiguo de pared",
    descripcion: "Reloj de péndulo, madera de roble, funcionando.",
    precioBase: 20000,
    incrementoMinimo: 1000,
    imagenUrl: null,
  },
  {
    id: "c4a1f900-0000-4000-8000-000000000002",
    martilleroSub: "d81fa021-0000-4000-8000-000000000001",
    titulo: "Bicicleta de montaña aro 29",
    descripcion: "Poco uso, frenos de disco hidráulicos.",
    precioBase: 80000,
    incrementoMinimo: 5000,
    imagenUrl: null,
  },
];

export const subastas = [
  {
    id: "1e77c3b0-0000-4000-8000-000000000001",
    loteId: lotes[0].id,
    estado: "ABIERTA",
    fechaApertura: "2026-08-27T18:00:00Z",
    fechaCierre: "2026-08-28T22:00:00Z",
  },
  {
    id: "1e77c3b0-0000-4000-8000-000000000002",
    loteId: lotes[1].id,
    estado: "PROGRAMADA",
    fechaApertura: "2026-09-01T18:00:00Z",
    fechaCierre: "2026-09-01T22:00:00Z",
  },
];

export const pujas = [
  {
    id: "9a2f1a10-0000-4000-8000-000000000001",
    subastaId: subastas[0].id,
    usuarioSub: "b3f1c2a4-0000-4000-8000-000000000001",
    monto: 24000,
    fecha: "2026-08-27T19:55:00Z",
  },
  {
    id: "8b1e77aa-0000-4000-8000-000000000001",
    subastaId: subastas[0].id,
    usuarioSub: "c72a90de-0000-0000-0000-000000000002",
    monto: 22000,
    fecha: "2026-08-27T19:40:00Z",
  },
];

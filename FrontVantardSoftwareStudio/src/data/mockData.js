// Datos simulados del sistema VSS
// Usuario actual (cliente demo)
export const usuarioActual = {
  id: "u1",
  nombre: "Alex",
  apellido: "Rivera",
  email: "20233tn092@utez.edu.mx",
  rol: "user",
  plan: "Básico",
  estadoPlan: "Activo",
  vencimientoPlan: null,
  creadoEn: "2025-09-15",
  totalDespliegues: 1,
  usoDiscoMB: 10,
  discoMaxMB: 50,
};

// Admin actual
export const adminActual = {
  id: "u0",
  nombre: "Admin",
  apellido: "VSS",
  email: "20233tn102@utez.edu.mx",
  rol: "admin",
  creadoEn: "2025-01-01",
};

// Lista de usuarios del sistema
export const usuarios = [
  {
    id: "u1",
    nombre: "Alex",
    apellido: "Rivera",
    email: "20233tn092@utez.edu.mx",
    estadoPlan: "Activo",
    plan: "Básico",
    totalDespliegues: 1,
    usoDiscoMB: 10,
    creadoEn: "2025-09-15",
  },
  {
    id: "u2",
    nombre: "Jordan",
    apellido: "Lee",
    email: "jordan@ejemplo.com",
    estadoPlan: "Activo",
    plan: "Básico",
    totalDespliegues: 1,
    usoDiscoMB: 12,
    creadoEn: "2025-10-02",
  },
  {
    id: "u3",
    nombre: "Morgan",
    apellido: "Patel",
    email: "morgan@ejemplo.com",
    estadoPlan: "Activo",
    plan: "Medio",
    totalDespliegues: 2,
    usoDiscoMB: 85,
    creadoEn: "2025-10-20",
  },
  {
    id: "u4",
    nombre: "Sam",
    apellido: "Kim",
    email: "sam@ejemplo.com",
    estadoPlan: "Activo",
    plan: "Completo",
    totalDespliegues: 3,
    usoDiscoMB: 210,
    creadoEn: "2025-11-05",
  },
  {
    id: "u5",
    nombre: "Casey",
    apellido: "Brown",
    email: "casey@ejemplo.com",
    estadoPlan: "Suspendido",
    plan: "Básico",
    totalDespliegues: 0,
    usoDiscoMB: 0,
    creadoEn: "2025-11-10",
  },
];

// Despliegues del sistema
export const despliegues = [
  {
    id: "d1",
    usuarioId: "u1",
    dominio: "mi-sitio.vss.app",
    estado: "Activo",
    usoDiscoMB: 10,
    trafico: 1240,
    creadoEn: "2025-09-20",
  },
  {
    id: "d2",
    usuarioId: "u2",
    dominio: "jordan-portfolio.vss.app",
    estado: "Activo",
    usoDiscoMB: 12,
    trafico: 876,
    creadoEn: "2025-10-05",
  },
  {
    id: "d3",
    usuarioId: "u3",
    dominio: "morgan-app.vss.app",
    estado: "Actualizando",
    usoDiscoMB: 45,
    trafico: 3200,
    creadoEn: "2025-10-25",
  },
  {
    id: "d4",
    usuarioId: "u3",
    dominio: "morgan-docs.vss.app",
    estado: "Activo",
    usoDiscoMB: 40,
    trafico: 2100,
    creadoEn: "2025-11-01",
  },
  {
    id: "d5",
    usuarioId: "u4",
    dominio: "sam-main.vss.app",
    estado: "Activo",
    usoDiscoMB: 80,
    trafico: 5500,
    creadoEn: "2025-11-08",
  },
  {
    id: "d6",
    usuarioId: "u4",
    dominio: "sam-api.vss.app",
    estado: "Error",
    usoDiscoMB: 70,
    trafico: 980,
    creadoEn: "2025-11-09",
  },
  {
    id: "d7",
    usuarioId: "u4",
    dominio: "sam-blog.vss.app",
    estado: "Activo",
    usoDiscoMB: 60,
    trafico: 2300,
    creadoEn: "2025-11-10",
  },
];

// Actividad reciente del sistema
export const actividad = [
  {
    id: "ac1",
    usuarioId: "u1",
    accion: "Desplegó",
    objetivo: "mi-sitio.vss.app",
    fecha: "2025-12-10T14:30:00Z",
  },
  {
    id: "ac2",
    usuarioId: "u1",
    accion: "Actualizó",
    objetivo: "mi-sitio.vss.app v2",
    fecha: "2025-12-08T09:15:00Z",
  },
  {
    id: "ac3",
    usuarioId: "u1",
    accion: "Solicitó upgrade a",
    objetivo: "Plan Medio",
    fecha: "2025-12-01T11:00:00Z",
  },
  {
    id: "ac4",
    usuarioId: "u2",
    accion: "Desplegó",
    objetivo: "jordan-portfolio.vss.app",
    fecha: "2025-12-09T08:00:00Z",
  },
  {
    id: "ac5",
    usuarioId: "u3",
    accion: "Actualizó",
    objetivo: "morgan-app.vss.app",
    fecha: "2025-12-07T16:00:00Z",
  },
  {
    id: "ac6",
    usuarioId: "u4",
    accion: "Desplegó",
    objetivo: "sam-blog.vss.app",
    fecha: "2025-12-06T10:00:00Z",
  },
];

// Logs de acceso a despliegues
export const logsAcceso = [
  {
    id: "l1",
    despliegueId: "d1",
    ip: "192.168.1.1", // NOSONAR - mock data only
    ruta: "/index.html",
    metodo: "GET",
    codigo: 200,
    fecha: "2025-12-10T10:00:00Z",
  },
  {
    id: "l2",
    despliegueId: "d1",
    ip: "10.0.0.5", // NOSONAR - mock data only
    ruta: "/about.html",
    metodo: "GET",
    codigo: 200,
    fecha: "2025-12-10T10:05:00Z",
  },
  {
    id: "l3",
    despliegueId: "d1",
    ip: "172.16.0.3", // NOSONAR - mock data only
    ruta: "/contact.html",
    metodo: "GET",
    codigo: 200,
    fecha: "2025-12-10T10:12:00Z",
  },
  {
    id: "l4",
    despliegueId: "d1",
    ip: "192.168.2.10", // NOSONAR - mock data only
    ruta: "/index.html",
    metodo: "GET",
    codigo: 200,
    fecha: "2025-12-09T15:30:00Z",
  },
  {
    id: "l5",
    despliegueId: "d1",
    ip: "10.0.1.2", // NOSONAR - mock data only
    ruta: "/blog/post-1.html",
    metodo: "GET",
    codigo: 404,
    fecha: "2025-12-09T16:00:00Z",
  },
  {
    id: "l6",
    despliegueId: "d2",
    ip: "192.168.3.5", // NOSONAR - mock data only
    ruta: "/index.html",
    metodo: "GET",
    codigo: 200,
    fecha: "2025-12-10T09:00:00Z",
  },
  {
    id: "l7",
    despliegueId: "d3",
    ip: "10.10.1.1", // NOSONAR - mock data only
    ruta: "/",
    metodo: "GET",
    codigo: 200,
    fecha: "2025-12-10T11:00:00Z",
  },
];

// Datos de tráfico por día (últimos 7 días)
export const datosTrafico = [
  { fecha: "2025-12-04", visitas: 180 },
  { fecha: "2025-12-05", visitas: 210 },
  { fecha: "2025-12-06", visitas: 95 },
  { fecha: "2025-12-07", visitas: 130 },
  { fecha: "2025-12-08", visitas: 275 },
  { fecha: "2025-12-09", visitas: 320 },
  { fecha: "2025-12-10", visitas: 230 },
];

// Solicitudes de cambio de plan
export const solicitudesPlan = [
  {
    id: "sp1",
    usuarioId: "u1",
    planSolicitado: "Medio",
    tipo: "Upgrade",
    meses: 3,
    total: 57,
    estado: "Pendiente",
    creadoEn: "2025-12-01",
  },
  {
    id: "sp2",
    usuarioId: "u3",
    planSolicitado: "Completo",
    tipo: "Upgrade",
    meses: 1,
    total: 49,
    estado: "Aprobado",
    creadoEn: "2025-11-15",
  },
  {
    id: "sp3",
    usuarioId: "u2",
    planSolicitado: "Medio",
    tipo: "Renovación",
    meses: 6,
    total: 114,
    estado: "Rechazado",
    creadoEn: "2025-11-20",
  },
];

// Catálogo de planes
export const planes = [
  {
    id: "basico",
    nombre: "Básico",
    precio: 0,
    discoMaxMB: 50,
    cargaMaxMB: 5,
    habilitado: true,
  },
  {
    id: "medio",
    nombre: "Medio",
    precio: 19,
    discoMaxMB: 200,
    cargaMaxMB: 10,
    habilitado: true,
  },
  {
    id: "completo",
    nombre: "Completo",
    precio: 49,
    discoMaxMB: 500,
    cargaMaxMB: 20,
    habilitado: true,
  },
];

// Estadísticas globales del sistema
export const estadisticasGlobales = {
  totalUsuarios: 5,
  totalDespliegues: 7,
  almacenamientoUsadoMB: 317,
  traficoTotal: 16196,
};

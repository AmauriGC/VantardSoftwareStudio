export function formatearFecha(iso) {
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildPasswordChecklist(password) {
  const value = String(password ?? "");
  return [
    { label: "Mínimo 8 caracteres", ok: value.length >= 8 },
    { label: "Al menos una mayúscula", ok: /[A-Z]/.test(value) },
    { label: "Al menos una minúscula", ok: /[a-z]/.test(value) },
    { label: "Al menos un número", ok: /\d/.test(value) },
    { label: "Al menos un carácter especial", ok: /[^A-Za-z0-9]/.test(value) },
  ];
}

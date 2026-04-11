// Patrones y sanitizadores puros (sin mensajes)

export const PATTERNS = {
  // Unicode letters (incluye acentos, ñ, etc.)
  ONLY_LETTERS: /\p{L}+/gu,
  // Nombres de persona: letras (incluye acentos), espacios, punto, apostrofe y guion
  PERSON_NAME: /^[\p{L}\s'.-]+$/u,
  EMAIL:
    // No pretende cubrir 100% RFC; suficiente para validación UX
    // [^\s@]+ en el dominio permite subdominios como utez.edu.mx
    /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/,
};

// Dominios permitidos (para validación UX; la validación real será del back-end)
export const EMAIL_ALLOWED_DOMAINS = ["utez.edu.mx", "gmail.com"];

export function trim(value) {
  return String(value ?? "").trim();
}

export function toLower(value) {
  return String(value ?? "").toLowerCase();
}

export function collapseSpaces(value) {
  return String(value ?? "").replaceAll(/\s+/g, " ");
}

// Conserva solo letras (permite acentos y ñ). Ej: "12asd2-." => "asd"
export function keepOnlyLetters(value) {
  return String(value ?? "").replaceAll(/[^\p{L}]/gu, "");
}

// Conserva solo letras y espacios (para nombres compuestos)
export function keepOnlyLettersAndSpaces(value) {
  return String(value ?? "").replaceAll(/[^\p{L}\s]/gu, "");
}

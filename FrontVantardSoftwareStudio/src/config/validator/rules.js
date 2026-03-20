import {
  EMAIL_ALLOWED_DOMAINS,
  PATTERNS,
  collapseSpaces,
  keepOnlyLetters,
  keepOnlyLettersAndSpaces,
  toLower,
  trim,
} from "./patterns";

// Regla: una validación con mensaje (no combinar mensajes)
export function required(message = "Este campo es obligatorio.") {
  return {
    name: "required",
    message,
    validate: (value) => String(value ?? "").trim().length > 0,
  };
}

export function minLength(min, message = `Debe tener mínimo ${min} caracteres.`) {
  return {
    name: "minLength",
    message,
    validate: (value) => String(value ?? "").length >= min,
  };
}

export function maxLength(max, message = `Debe tener máximo ${max} caracteres.`) {
  return {
    name: "maxLength",
    message,
    validate: (value) => String(value ?? "").length <= max,
  };
}

export function emailFormat(message = "Ingresa un correo válido.") {
  return {
    name: "emailFormat",
    message,
    validate: (value, _context, phase) => {
      const v = String(value ?? "").trim();

      // Mientras escribe, no mostrar error hasta que el input parezca un correo "completo".
      if (phase === "change") {
        if (!v.includes("@")) return true;
        const atIndex = v.indexOf("@");
        const domain = v.slice(atIndex + 1);
        if (!domain.includes(".")) return true;
      }

      return PATTERNS.EMAIL.test(v);
    },
  };
}

export function allowedEmailDomains(domains, message = "Dominio de correo no permitido.") {
  const allowed = (Array.isArray(domains) ? domains : [])
    .map((d) => String(d ?? "").trim().toLowerCase())
    .filter(Boolean);

  return {
    name: "allowedEmailDomains",
    message,
    validate: (value, _context, phase) => {
      const v = String(value ?? "").trim().toLowerCase();
      if (!v) return true;

      // Mismo criterio de no-agresivo mientras escribe
      if (phase === "change") {
        if (!v.includes("@")) return true;
        const atIndex = v.indexOf("@");
        const domain = v.slice(atIndex + 1);
        if (!domain.includes(".")) return true;
      }

      // Si el formato base aún no pasa, no forzamos este mensaje; lo manejará emailFormat.
      if (!PATTERNS.EMAIL.test(v)) return true;

      const domain = v.split("@").pop();
      return allowed.includes(domain);
    },
  };
}

export function sameAs(getOtherValue, message = "Los campos no coinciden.") {
  return {
    name: "sameAs",
    message,
    validate: (value, context) => String(value ?? "") === String(getOtherValue(context) ?? ""),
  };
}

export function validateField(rawValue, group, context, phase = "change") {
  const transforms = group?.transforms ?? [];
  const validators = group?.validators ?? [];

  const value = transforms.reduce((acc, fn) => fn(acc), rawValue);

  const errors = [];
  for (const rule of validators) {
    const ok = rule.validate(value, context, phase);
    if (!ok) {
      errors.push({ name: rule.name, message: rule.message });
    }
  }

  return { value, errors, firstError: errors[0]?.message ?? "" };
}

export function createGroup({ transforms = [], validators = [] } = {}) {
  return { transforms, validators };
}

export function extendGroup(baseGroup, { transforms, validators } = {}) {
  return {
    transforms: transforms ?? baseGroup.transforms,
    validators: validators ?? baseGroup.validators,
  };
}

// Grupos de validación (de lo general a lo particular)
export const VALIDATION_GROUPS = {
  // Texto general (solo letras) -> luego longitudes
  onlyLettersText: createGroup({
    transforms: [trim, keepOnlyLetters],
    validators: [],
  }),

  fullName: createGroup({
    transforms: [trim, keepOnlyLettersAndSpaces, collapseSpaces],
    validators: [
      required("El nombre completo es obligatorio."),
      minLength(3, "El nombre completo debe tener al menos 3 caracteres."),
      maxLength(80, "El nombre completo debe tener máximo 80 caracteres."),
    ],
  }),

  authEmail: createGroup({
    transforms: [trim, toLower],
    validators: [
      required("El correo es obligatorio."),
      emailFormat("Ingresa un correo válido."),
      allowedEmailDomains(
        EMAIL_ALLOWED_DOMAINS,
        "Solo se permiten correos @utez.edu.mx o @gmail.com."
      ),
    ],
  }),

  loginPassword: createGroup({
    transforms: [trim],
    validators: [required("La contraseña es obligatoria.")],
  }),

  registerPassword: createGroup({
    transforms: [trim],
    validators: [required("La contraseña es obligatoria.")],
  }),

  confirmPassword: createGroup({
    transforms: [trim],
    validators: [
      required("La confirmación de contraseña es obligatoria."),
      sameAs((ctx) => ctx?.password, "Las contraseñas no coinciden."),
    ],
  }),
};

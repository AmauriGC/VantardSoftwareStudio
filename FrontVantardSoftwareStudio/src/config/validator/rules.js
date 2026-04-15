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
  const allowed = new Set(
    (Array.isArray(domains) ? domains : [])
      .map((d) => String(d ?? "").trim().toLowerCase())
      .filter(Boolean)
  );

  const allowedInitials = new Set(
    Array.from(allowed)
      .map((d) => d[0])
      .filter(Boolean)
  );

  return {
    name: "allowedEmailDomains",
    message,
    validate: (value, _context, phase) => {
      const v = String(value ?? "").trim().toLowerCase();
      if (!v) return true;

      const atIndex = v.indexOf("@");
      if (atIndex === -1) return true;

      const domainPart = v.slice(atIndex + 1);

      // Comportamiento más reactivo mientras escribe:
      if (phase === "change") {
        if (!domainPart) return true;

        const firstChar = domainPart[0];
        // Si la primera letra del dominio no coincide con ninguna de las iniciales
        // de los dominios permitidos (utez.edu.mx, gmail.com => u/g), marcamos error inmediato.
        if (!allowedInitials.has(firstChar)) {
          return false;
        }

        // Mientras no haya punto en el dominio, dejamos que emailFormat maneje el resto.
        if (!domainPart.includes(".")) return true;
      }

      // Si el formato base aún no pasa, no forzamos este mensaje; lo manejará emailFormat.
      if (!PATTERNS.EMAIL.test(v)) return true;

      const domain = v.split("@").pop();
      return allowed.has(domain);
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

export function hasUppercase(message = "Debe incluir al menos una letra mayúscula.") {
  return {
    name: "hasUppercase",
    message,
    validate: (value) => /[A-Z]/.test(String(value ?? "")),
  };
}

export function hasLowercase(message = "Debe incluir al menos una letra minúscula.") {
  return {
    name: "hasLowercase",
    message,
    validate: (value) => /[a-z]/.test(String(value ?? "")),
  };
}

export function hasNumber(message = "Debe incluir al menos un número.") {
  return {
    name: "hasNumber",
    message,
    validate: (value) => /\d/.test(String(value ?? "")),
  };
}

export function hasSpecialChar(message = "Debe incluir al menos un carácter especial.") {
  return {
    name: "hasSpecialChar",
    message,
    validate: (value) => /[^A-Za-z0-9]/.test(String(value ?? "")),
  };
}

export function personNameFormat(
  message = "Solo se permiten letras, espacios, puntos, apóstrofes y guiones."
) {
  return {
    name: "personNameFormat",
    message,
    validate: (value) => {
      const v = String(value ?? "").trim();
      if (!v) return true; // que 'required' se encargue del vacío
      return PATTERNS.PERSON_NAME.test(v);
    },
  };
}

export function isInteger(message = "Debe ser un número entero.") {
  return {
    name: "isInteger",
    message,
    validate: (value) => {
      const v = String(value ?? "").trim();
      if (!v) return true;
      return Number.isInteger(Number(v)) && !v.includes(".");
    },
  };
}

export function isFiniteNumber(message = "Debe ser un número válido.") {
  return {
    name: "isFiniteNumber",
    message,
    validate: (value) => {
      const v = String(value ?? "").trim();
      if (!v) return true;
      return Number.isFinite(Number(v));
    },
  };
}

export function min(n, message = `El valor mínimo es ${n}.`) {
  return {
    name: "min",
    message,
    validate: (value) => {
      const v = String(value ?? "").trim();
      if (!v) return true;
      return Number(v) >= n;
    },
  };
}

export function max(n, message = `El valor máximo es ${n}.`) {
  return {
    name: "max",
    message,
    validate: (value) => {
      const v = String(value ?? "").trim();
      if (!v) return true;
      return Number(v) <= n;
    },
  };
}

export function domainFormat(
  message = "Solo letras minúsculas, números y guiones. Mínimo 3 caracteres, sin guion al inicio ni al final."
) {
  return {
    name: "domainFormat",
    message,
    validate: (value) => {
      const v = String(value ?? "").trim();
      if (!v) return true;
      return v.length >= 3 && /^[a-z0-9]/.test(v) && /[a-z0-9]$/.test(v);
    },
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
    transforms: [keepOnlyLettersAndSpaces, collapseSpaces],
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
    validators: [
      required("La contraseña es obligatoria."),
      minLength(8, "Debe tener al menos 8 caracteres."),
      hasUppercase(),
      hasLowercase(),
      hasNumber(),
      hasSpecialChar(),
    ],
  }),

  confirmPassword: createGroup({
    transforms: [trim],
    validators: [
      required("La confirmación de contraseña es obligatoria."),
      sameAs((ctx) => ctx?.password, "Las contraseñas no coinciden."),
    ],
  }),

  adminUserFirstName: createGroup({
    // Permitimos que el usuario vea los espacios mientras escribe;
    // solo colapsamos espacios duplicados.
    transforms: [collapseSpaces],
    validators: [
      required("El nombre es obligatorio."),
      personNameFormat(),
    ],
  }),

  adminUserLastName: createGroup({
    // Igual que en el nombre: no quitamos espacios al vuelo.
    transforms: [collapseSpaces],
    validators: [
      required("El apellido es obligatorio."),
      personNameFormat(),
    ],
  }),

  deploymentDomain: createGroup({
    transforms: [(v) => String(v ?? "").replace(/[^a-z0-9-]/g, "").toLowerCase()],
    validators: [
      required("El nombre del dominio es obligatorio."),
      domainFormat(),
    ],
  }),

  planMonths: createGroup({
    transforms: [trim],
    validators: [
      required("El número de meses es obligatorio."),
      isInteger("Debe ser un número entero."),
      min(1, "El mínimo es 1 mes."),
      max(12, "El máximo es 12 meses."),
    ],
  }),

  planPrice: createGroup({
    transforms: [trim],
    validators: [
      required("El precio es obligatorio."),
      isFiniteNumber("Debe ser un número válido."),
      min(0, "El precio no puede ser negativo."),
    ],
  }),

  planDiskMB: createGroup({
    transforms: [trim],
    validators: [
      required("El tamaño de disco es obligatorio."),
      isInteger("Debe ser un número entero."),
      min(1, "El disco mínimo es 1 MB."),
    ],
  }),
};

import { useCallback, useState } from "react";

import { validateField } from "./rules";

export default function useValidatedField(initialValue, group, getContext) {
  const [fieldValue, setFieldValue] = useState(initialValue ?? "");
  const [touched, setTouched] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");

  const runValidation = useCallback(
    (nextValue, phase = "change") => {
      const context = typeof getContext === "function" ? getContext() : undefined;
      const result = validateField(nextValue, group, context, phase);
      setError(result.firstError);
      return { ...result, ok: result.errors.length === 0 };
    },
    [group, getContext]
  );

  const setValue = useCallback(
    (nextValue, { shouldValidate = false, shouldTouch = false, shouldDirty = true } = {}) => {
      const context = typeof getContext === "function" ? getContext() : undefined;
      const result = validateField(nextValue, group, context, "change");
      setFieldValue(result.value);
      if (shouldTouch) setTouched(true);
      if (shouldDirty) setDirty(true);

      // Regla UX: no mostrar errores hasta que el usuario empiece a escribir (dirty) o se fuerce validate()
      if (shouldValidate || (dirty && touched)) {
        setError(result.firstError);
      }
      return { ...result, ok: result.errors.length === 0 };
    },
    [group, getContext, touched, dirty]
  );

  const onChange = useCallback(
    (eOrValue) => {
      const nextValue = typeof eOrValue === "string" ? eOrValue : eOrValue?.target?.value;
      // UX: desde el primer caracter, validación reactiva.
      // Nota: si el usuario solo enfoca y sale, onBlur no valida (dirty=false).
      setValue(nextValue ?? "", { shouldValidate: true, shouldDirty: true });
    },
    [setValue]
  );

  const onBlur = useCallback(() => {
    setTouched(true);
    // Solo validar en blur si ya escribió (dirty)
    if (dirty) runValidation(fieldValue, "change");
  }, [runValidation, fieldValue, dirty]);

  const validate = useCallback(() => {
    setTouched(true);
    setDirty(true);
    const result = runValidation(fieldValue, "submit");
    return result.ok;
  }, [runValidation, fieldValue]);

  return {
    value: fieldValue,
    setValue,
    onChange,
    onBlur,
    validate,
    touched,
    dirty,
    error,
  };
}

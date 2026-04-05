-- Crear usuario de aplicación (NO usar root)
CREATE USER '<DB_USER>'@'localhost'
IDENTIFIED BY '<STRONG_PASSWORD>';

-- Permisos mínimos necesarios (principio de menor privilegio)
GRANT SELECT, INSERT, UPDATE
ON vss.*
TO '<DB_USER>'@'localhost';

-- Aplicar cambios
FLUSH PRIVILEGES;

-- IMPORTANTE:
-- 1. NO usar '%' como host en producción (riesgo de seguridad)
-- 2. Usar una contraseña fuerte (mínimo 12 caracteres, con símbolos)
-- 3. NO otorgar permisos como DROP, ALTER o GRANT si no son necesarios
-- 4. Este usuario es solo para la aplicación, NO para administración
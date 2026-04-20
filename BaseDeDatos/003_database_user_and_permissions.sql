-- Crear usuario de aplicación (NO usar root)
CREATE USER IF NOT EXISTS 'vss'@'%' IDENTIFIED BY 'vantardsoftwarestudio2102.';

-- Permisos mínimos necesarios (principio de menor privilegio)
GRANT ALL PRIVILEGES ON railway.* TO 'vss'@'%';

-- Aplicar cambios
FLUSH PRIVILEGES;

-- Seguridad final
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'vss'@'%';

GRANT SELECT, INSERT, UPDATE, DELETE, TRIGGER, EVENT
ON railway.* TO 'vss'@'%';

FLUSH PRIVILEGES;
-- Ejecuta este script DESPUÉS de correr las migraciones de Django

SET FOREIGN_KEY_CHECKS = 0;

-- ========================
-- TRIGGERS
-- ========================

DELIMITER $$

CREATE TRIGGER `trg_validate_storage_limit`
BEFORE INSERT ON `deployments`
FOR EACH ROW
BEGIN
    DECLARE allowed_space INT;

    SELECT p.max_disk_mb
    INTO allowed_space
    FROM user_plans up
    JOIN plans p ON up.plan_id = p.id
    WHERE up.user_id = NEW.user_id
      AND up.status = 'active'
      AND up.deleted_at IS NULL
    LIMIT 1;

    IF allowed_space IS NOT NULL AND NEW.disk_used_mb > allowed_space THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Storage limit exceeded for current plan';
    END IF;
END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER `trg_replace_previous_deployment`
BEFORE INSERT ON `deployments`
FOR EACH ROW
BEGIN
    UPDATE deployments
    SET status = 'replaced'
    WHERE user_id = NEW.user_id
      AND status = 'active'
      AND deleted_at IS NULL;
END$$

DELIMITER ;

-- ========================
-- EVENTS
-- ========================
DELIMITER $$

CREATE EVENT IF NOT EXISTS `event_expire_user_plans`
ON SCHEDULE EVERY 1 DAY
DO
BEGIN
  -- 1) Expirar planes vencidos y bloquear despliegues asociados
  UPDATE user_plans up
  JOIN deployments d ON up.user_id = d.user_id
  SET up.status = 'expired',
      d.status = 'blocked'
  WHERE up.expiration_date < NOW()
    AND up.status = 'active';

  -- 2) Aplicar automáticamente solicitudes aprobadas cuyo current_plan ya expiró
  INSERT INTO user_plans (
      user_id,
      plan_id,
      purchase_date,
      expiration_date,
      months_purchased,
      total_price_paid,
      status,
      created_at,
      updated_at
  )
  SELECT
      r.user_id,
      r.requested_plan_id,
      NOW() AS purchase_date,
      DATE_ADD(NOW(), INTERVAL IFNULL(r.months_requested, 1) * 30 DAY) AS expiration_date,
      IFNULL(r.months_requested, 1) AS months_purchased,
      IFNULL(r.total_price, 0) AS total_price_paid,
      'active' AS status,
      NOW() AS created_at,
      NOW() AS updated_at
  FROM plan_change_requests r
  JOIN user_plans up ON r.current_plan_id = up.id
  WHERE r.status = 'approved'
    AND r.deleted_at IS NULL
    AND r.completed_at IS NULL
    AND up.status = 'expired'
    AND up.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM user_plans up2
      WHERE up2.user_id = r.user_id
        AND up2.status = 'active'
        AND up2.deleted_at IS NULL
    );

  UPDATE plan_change_requests r
  JOIN user_plans up ON r.current_plan_id = up.id
  SET r.status = 'completed',
      r.completed_at = NOW(),
      r.updated_at = NOW()
  WHERE r.status = 'approved'
    AND r.deleted_at IS NULL
    AND r.completed_at IS NULL
    AND up.status = 'expired'
    AND up.deleted_at IS NULL;
END$$
DELIMITER ;


CREATE EVENT IF NOT EXISTS `event_deactivate_inactive_deployments`
ON SCHEDULE EVERY 1 DAY
DO
  UPDATE deployments
  SET status = 'inactive'
  WHERE traffic_visit_count = 0
    AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
    AND status = 'active'
    AND deleted_at IS NULL;

-- ========================
-- VIEWS
-- ========================

CREATE OR REPLACE VIEW `vw_active_users_with_plan` AS
SELECT u.id,
       u.first_name,
       u.email,
       p.name AS plan_name,
       up.expiration_date
FROM users u
JOIN user_plans up ON u.id = up.user_id
JOIN plans p ON up.plan_id = p.id
WHERE up.status = 'active';

CREATE OR REPLACE VIEW `vw_storage_usage` AS
SELECT u.first_name,
       p.name AS plan_name,
       d.disk_used_mb,
       p.max_disk_mb,
       (p.max_disk_mb - d.disk_used_mb) AS remaining_space_mb
FROM users u
JOIN deployments d ON u.id = d.user_id
JOIN user_plans up ON u.id = up.user_id
JOIN plans p ON up.plan_id = p.id
WHERE up.status = 'active';


-- ========================
-- DASHBOARD VIEWS (Admin/User)
-- ========================

-- Admin: métricas generales (una sola fila)
DROP VIEW IF EXISTS vw_admin_dashboard_stats;
CREATE VIEW vw_admin_dashboard_stats AS
SELECT
  1 AS id,
  (
    SELECT COUNT(*)
    FROM users u
    WHERE u.deleted_at IS NULL
  ) AS total_users,
  (
    SELECT COUNT(DISTINCT up.user_id)
    FROM user_plans up
    WHERE up.deleted_at IS NULL
      AND up.status = 'active'
      AND up.expiration_date > NOW()
  ) AS active_users,
  (
    SELECT COUNT(*)
    FROM deployments d
    WHERE d.deleted_at IS NULL
  ) AS total_deployments,
  (
    SELECT COUNT(*)
    FROM deployments d
    WHERE d.deleted_at IS NULL
      AND d.status = 'active'
  ) AS active_deployments,
  (
    SELECT COALESCE(SUM(d.disk_used_mb), 0)
    FROM deployments d
    WHERE d.deleted_at IS NULL
  ) AS total_disk_used_mb,
  (
    SELECT COALESCE(SUM(d.traffic_visit_count), 0)
    FROM deployments d
    WHERE d.deleted_at IS NULL
  ) AS total_traffic_visit_count;


-- Admin: distribución de planes (cuenta usuarios con suscripción activa vigente)
DROP VIEW IF EXISTS vw_admin_plan_distribution;
CREATE VIEW vw_admin_plan_distribution AS
SELECT
  p.id AS id,
  p.name AS plan_name,
  COALESCE(COUNT(DISTINCT up.user_id), 0) AS user_count
FROM plans p
LEFT JOIN user_plans up
  ON up.plan_id = p.id
   AND up.deleted_at IS NULL
   AND up.status = 'active'
   AND up.expiration_date > NOW()
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name;


-- Admin: conteo por status real (active/replaced/failed/etc)
DROP VIEW IF EXISTS vw_admin_deployment_state_counts;
CREATE VIEW vw_admin_deployment_state_counts AS
SELECT
  d.status AS estado,
  COUNT(*) AS cantidad
FROM deployments d
WHERE d.deleted_at IS NULL
GROUP BY d.status;


-- User: métricas del dashboard por usuario (una fila por user_id)
DROP VIEW IF EXISTS vw_user_dashboard_profile;
CREATE VIEW vw_user_dashboard_profile AS
SELECT
  u.id AS user_id,
  u.first_name,
  u.last_name,
  u.email,
  MAX(p.name) AS plan_name,
  COALESCE(MAX(p.max_disk_mb), 0) AS plan_max_disk_mb,
  COALESCE(MAX(CASE WHEN d.status = 'active' THEN d.disk_used_mb END), 0) AS used_disk_mb,
  COALESCE(SUM(d.traffic_visit_count), 0) AS total_traffic_visit_count,
  MAX(CASE WHEN d.status = 'active' THEN d.domain END) AS active_site_domain,
  MAX(CASE WHEN d.status = 'active' THEN d.disk_used_mb END) AS active_site_disk_used_mb
FROM users u
LEFT JOIN user_plans up
  ON up.user_id = u.id
   AND up.deleted_at IS NULL
   AND up.status = 'active'
   AND up.expiration_date > NOW()
LEFT JOIN plans p
  ON p.id = up.plan_id
   AND p.deleted_at IS NULL
LEFT JOIN deployments d
  ON d.user_id = u.id
   AND d.deleted_at IS NULL
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.first_name, u.last_name, u.email;

SET FOREIGN_KEY_CHECKS = 1;
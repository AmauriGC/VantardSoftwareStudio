-- Ejecuta este script DESPUÉS de correr las migraciones de Django

SET FOREIGN_KEY_CHECKS = 0;

-- ========================
-- TRIGGERS
-- ========================

DELIMITER $$

CREATE TRIGGER `trg_validate_storage_limit`
BEFORE INSERT ON `deployment_versions` FOR EACH ROW
BEGIN
    DECLARE allowed_space INT;

    SELECT p.max_disk_mb
    INTO allowed_space
    FROM deployments d
    JOIN user_plans up ON d.user_id = up.user_id
    JOIN plans p ON up.plan_id = p.id
    WHERE d.id = NEW.deployment_id
      AND up.status = 'active'
    LIMIT 1;

    IF allowed_space IS NOT NULL AND NEW.disk_used_mb > allowed_space THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Storage limit exceeded for current plan';
    END IF;
END$$

CREATE TRIGGER `trg_replace_previous_version`
BEFORE INSERT ON `deployment_versions` FOR EACH ROW
BEGIN
    UPDATE deployment_versions
    SET status = 'replaced'
    WHERE deployment_id = NEW.deployment_id
      AND status = 'active';
END$$

DELIMITER ;

-- ========================
-- EVENTS
-- ========================

CREATE EVENT IF NOT EXISTS `event_expire_user_plans`
ON SCHEDULE EVERY 1 DAY
DO
  UPDATE user_plans up
  JOIN deployments d ON up.user_id = d.user_id
  SET up.status = 'expired',
      d.status = 'blocked'
  WHERE up.expiration_date < NOW()
    AND up.status = 'active';

CREATE EVENT IF NOT EXISTS `event_monthly_traffic_reset`
ON SCHEDULE EVERY 1 MONTH
DO
  UPDATE deployments
  SET traffic_visit_count = 0;

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

SET FOREIGN_KEY_CHECKS = 1;
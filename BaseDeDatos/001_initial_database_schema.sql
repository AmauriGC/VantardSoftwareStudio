/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plans` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `max_disk_mb` int NOT NULL,
  `status` varchar(20) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_plans_deleted_at` (`deleted_at`),
  CONSTRAINT `chk_plans_status_valid` CHECK ((`status` in (_utf8mb4'active',_utf8mb4'inactive')))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `last_login` datetime(6) DEFAULT NULL,
  `is_superuser` tinyint(1) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `status` varchar(20) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  `is_staff` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `role_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `users_role_id_1900a745_fk_roles_id` (`role_id`),
  KEY `idx_users_deleted_at` (`deleted_at`),
  CONSTRAINT `users_role_id_1900a745_fk_roles_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `chk_users_status_valid` CHECK ((`status` in (_utf8mb4'active',_utf8mb4'blocked')))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_plans` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `purchase_date` datetime(6) NOT NULL,
  `expiration_date` datetime(6) NOT NULL,
  `months_purchased` int NOT NULL,
  `total_price_paid` decimal(10,2) NOT NULL,
  `status` varchar(20) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  `plan_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_plans_plan_id_4a9c7986_fk_plans_id` (`plan_id`),
  KEY `user_plans_user_id_7b7e70af_fk_users_id` (`user_id`),
  KEY `idx_user_plans_purchase_date` (`purchase_date`),
  KEY `idx_user_plans_expiration_date` (`expiration_date`),
  KEY `idx_user_plans_deleted_at` (`deleted_at`),
  CONSTRAINT `user_plans_plan_id_4a9c7986_fk_plans_id` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`),
  CONSTRAINT `user_plans_user_id_7b7e70af_fk_users_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `chk_user_plans_status_valid` CHECK ((`status` in (_utf8mb4'active',_utf8mb4'expired',_utf8mb4'cancelled')))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `deployments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `domain` varchar(255) NOT NULL,
  `site_url` varchar(255) NOT NULL,
  `version_number` int NOT NULL,
  `zip_filename` varchar(255) NOT NULL,
  `zip_path` varchar(500) NOT NULL,
  `disk_used_mb` int NOT NULL,
  `traffic_visit_count` int NOT NULL,
  `status` varchar(20) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_deployments_user_version_number` (`user_id`,`version_number`),
  KEY `idx_deployments_created_at` (`created_at`),
  KEY `idx_deployments_deleted_at` (`deleted_at`),
  CONSTRAINT `deployments_user_id_717d5250_fk_users_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `chk_deployments_status_valid` CHECK ((`status` in (_utf8mb4'active',_utf8mb4'blocked',_utf8mb4'inactive',_utf8mb4'replaced',_utf8mb4'failed')))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plan_change_requests` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `months_requested` int DEFAULT NULL,
  `total_price` decimal(10,2) DEFAULT NULL,
  `reason` varchar(500) NOT NULL,
  `status` varchar(20) NOT NULL,
  `reviewed_at` datetime(6) DEFAULT NULL,
  `completed_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  `current_plan_id` bigint NOT NULL,
  `requested_plan_id` bigint NOT NULL,
  `reviewed_by_id` bigint DEFAULT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `plan_change_requests_current_plan_id_24275c6c_fk_user_plans_id` (`current_plan_id`),
  KEY `plan_change_requests_requested_plan_id_1e702850_fk_plans_id` (`requested_plan_id`),
  KEY `plan_change_requests_reviewed_by_id_c2a9077a_fk_users_id` (`reviewed_by_id`),
  KEY `plan_change_requests_user_id_072a5045_fk_users_id` (`user_id`),
  KEY `idx_plan_change_req_created_at` (`created_at`),
  KEY `idx_plan_change_req_deleted_at` (`deleted_at`),
  CONSTRAINT `plan_change_requests_current_plan_id_24275c6c_fk_user_plans_id` FOREIGN KEY (`current_plan_id`) REFERENCES `user_plans` (`id`),
  CONSTRAINT `plan_change_requests_requested_plan_id_1e702850_fk_plans_id` FOREIGN KEY (`requested_plan_id`) REFERENCES `plans` (`id`),
  CONSTRAINT `plan_change_requests_reviewed_by_id_c2a9077a_fk_users_id` FOREIGN KEY (`reviewed_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `plan_change_requests_user_id_072a5045_fk_users_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `chk_plan_change_requests_status_valid` CHECK ((`status` in (_utf8mb4'pending',_utf8mb4'approved',_utf8mb4'rejected',_utf8mb4'completed',_utf8mb4'cancelled')))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `ip_address` varchar(45) NOT NULL,
  `request_path` varchar(500) NOT NULL,
  `action` varchar(100) NOT NULL,
  `http_method` varchar(10) NOT NULL,
  `status_code` int NOT NULL,
  `user_agent` varchar(255) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `user_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `system_logs_user_id_77b716fd_fk_users_id` (`user_id`),
  KEY `idx_system_logs_ip` (`ip_address`),
  KEY `idx_system_logs_action` (`action`),
  KEY `idx_system_logs_status_code` (`status_code`),
  KEY `idx_system_logs_created_at` (`created_at`),
  CONSTRAINT `system_logs_user_id_77b716fd_fk_users_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=168 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

from django.db import models


class ActiveUserWithPlan(models.Model):
	id = models.BigIntegerField(primary_key=True, db_column='id')
	first_name = models.CharField(max_length=100, db_column='first_name')
	email = models.EmailField(max_length=150, db_column='email')
	plan_name = models.CharField(max_length=50, db_column='plan_name')
	expiration_date = models.DateTimeField(db_column='expiration_date')

	class Meta:
		managed = False
		db_table = 'vw_active_users_with_plan'
		verbose_name = 'Active User With Plan'
		verbose_name_plural = 'Active Users With Plan'


class AdminDashboardStats(models.Model):
	id = models.IntegerField(primary_key=True, db_column='id')
	total_users = models.IntegerField(db_column='total_users')
	active_users = models.IntegerField(db_column='active_users')
	total_deployments = models.IntegerField(db_column='total_deployments')
	active_deployments = models.IntegerField(db_column='active_deployments')
	total_disk_used_mb = models.IntegerField(db_column='total_disk_used_mb')
	total_traffic_visit_count = models.IntegerField(db_column='total_traffic_visit_count')

	class Meta:
		managed = False
		db_table = 'vw_admin_dashboard_stats'
		verbose_name = 'Admin Dashboard Stat'
		verbose_name_plural = 'Admin Dashboard Stats'


class AdminPlanDistribution(models.Model):
	id = models.BigIntegerField(primary_key=True, db_column='id')
	plan_name = models.CharField(max_length=50, db_column='plan_name')
	user_count = models.IntegerField(db_column='user_count')

	class Meta:
		managed = False
		db_table = 'vw_admin_plan_distribution'
		verbose_name = 'Admin Plan Distribution'
		verbose_name_plural = 'Admin Plan Distribution'


class AdminDeploymentStateCount(models.Model):
	estado = models.CharField(primary_key=True, max_length=20, db_column='estado')
	cantidad = models.IntegerField(db_column='cantidad')

	class Meta:
		managed = False
		db_table = 'vw_admin_deployment_state_counts'
		verbose_name = 'Admin Deployment State Count'
		verbose_name_plural = 'Admin Deployment State Counts'


class UserDashboardProfile(models.Model):
	user_id = models.BigIntegerField(primary_key=True, db_column='user_id')
	first_name = models.CharField(max_length=100, db_column='first_name')
	last_name = models.CharField(max_length=100, db_column='last_name')
	email = models.EmailField(max_length=150, db_column='email')
	plan_name = models.CharField(max_length=50, null=True, blank=True, db_column='plan_name')
	plan_max_disk_mb = models.IntegerField(db_column='plan_max_disk_mb')
	used_disk_mb = models.IntegerField(db_column='used_disk_mb')
	total_traffic_visit_count = models.IntegerField(db_column='total_traffic_visit_count')
	active_site_domain = models.CharField(max_length=255, null=True, blank=True, db_column='active_site_domain')
	active_site_disk_used_mb = models.IntegerField(null=True, blank=True, db_column='active_site_disk_used_mb')

	class Meta:
		managed = False
		db_table = 'vw_user_dashboard_profile'
		verbose_name = 'User Dashboard Profile'
		verbose_name_plural = 'User Dashboard Profiles'

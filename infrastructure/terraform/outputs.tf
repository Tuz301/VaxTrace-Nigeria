# ============================================
# VaxTrace Nigeria - Terraform Outputs
# ============================================
# Output values after infrastructure provisioning
# ============================================

# ============================================
# POSTGRESQL OUTPUTS
# ============================================

output "postgres_primary_private_ip" {
  description = "Private IP address of PostgreSQL primary instance"
  value       = openstack_compute_instance_v2.postgres_primary.access_ip_v4
  sensitive   = true
}

output "postgres_standby_private_ip" {
  description = "Private IP address of PostgreSQL standby instance (DR)"
  value       = openstack_compute_instance_v2.postgres_standby.access_ip_v4
  sensitive   = true
}

output "postgres_primary_id" {
  description = "Instance ID of PostgreSQL primary"
  value       = openstack_compute_instance_v2.postgres_primary.id
}

output "postgres_standby_id" {
  description = "Instance ID of PostgreSQL standby"
  value       = openstack_compute_instance_v2.postgres_standby.id
}

output "postgres_primary_volume_id" {
  description = "Volume ID of PostgreSQL primary storage"
  value       = openstack_blockstorage_volume_v3.postgres_primary.id
}

output "postgres_connection_string" {
  description = "PostgreSQL connection string (use in application config)"
  value       = "postgresql://vaxtrace_admin:${random_password.postgres_password.result}@${openstack_compute_instance_v2.postgres_primary.access_ip_v4}:5432/vaxtrace_nigeria"
  sensitive   = true
}

output "postgres_password" {
  description = "PostgreSQL admin password (SAVE SECURELY)"
  value       = random_password.postgres_password.result
  sensitive   = true
}

# ============================================
# REDIS OUTPUTS
# ============================================

output "redis_private_ip" {
  description = "Private IP address of Redis instance"
  value       = openstack_compute_instance_v2.redis.access_ip_v4
  sensitive   = true
}

output "redis_id" {
  description = "Instance ID of Redis"
  value       = openstack_compute_instance_v2.redis.id
}

output "redis_connection_string" {
  description = "Redis connection string (use in application config)"
  value       = "redis://:${random_password.redis_password.result}@${openstack_compute_instance_v2.redis.access_ip_v4}:6379"
  sensitive   = true
}

output "redis_password" {
  description = "Redis password (SAVE SECURELY)"
  value       = random_password.redis_password.result
  sensitive   = true
}

# ============================================
# NETWORK OUTPUTS
# ============================================

output "network_id" {
  description = "VaxTrace private network ID"
  value       = openstack_networking_network_v2.vaxtrace_network.id
}

output "subnet_id" {
  description = "VaxTrace private subnet ID"
  value       = openstack_networking_subnet_v2.vaxtrace_subnet.id
}

output "router_id" {
  description = "VaxTrace router ID"
  value       = openstack_networking_router_v2.vaxtrace_router.id
}

output "postgres_security_group_id" {
  description = "Security group ID for PostgreSQL"
  value       = openstack_networking_secgroup_v2.postgres_sg.id
}

output "redis_security_group_id" {
  description = "Security group ID for Redis"
  value       = openstack_networking_secgroup_v2.redis_sg.id
}

# ============================================
# MANAGEMENT ACCESS
# ============================================

output "postgres_floating_ip" {
  description = "Floating IP for PostgreSQL management access (SSH)"
  value       = openstack_networking_floatingip_v2.postgres_primary_fip.address
  sensitive   = true
}

# ============================================
# BACKUP OUTPUTS
# ============================================

output "postgres_backup_id" {
  description = "Daily backup ID for PostgreSQL"
  value       = openstack_blockstorage_backup_v3.postgres_daily_backup.id
}

# ============================================
# ENVIRONMENT FILE SNIPPET
# ============================================

output "env_file_config" {
  description = "Configuration snippet for .env file"
  value = <<-EOT
    # Database Configuration (GBB)
    POSTGRES_HOST=${openstack_compute_instance_v2.postgres_primary.access_ip_v4}
    POSTGRES_PORT=5432
    POSTGRES_USER=vaxtrace_admin
    POSTGRES_PASSWORD=${random_password.postgres_password.result}
    POSTGRES_DB=vaxtrace_nigeria
    POSTGRES_STANDBY_HOST=${openstack_compute_instance_v2.postgres_standby.access_ip_v4}
    
    # Redis Configuration
    REDIS_HOST=${openstack_compute_instance_v2.redis.access_ip_v4}
    REDIS_PORT=6379
    REDIS_PASSWORD=${random_password.redis_password.result}
  EOT
  sensitive = true
}

# ============================================
# DISASTER RECOVERY INFO
# ============================================

output "dr_configuration" {
  description = "Disaster Recovery configuration details"
  value = {
    primary_az        = var.gbb_primary_az
    standby_az        = var.gbb_dr_az
    replication_type  = "streaming_replication"
    backup_retention  = var.backup_retention_days
    backup_schedule   = var.backup_schedule
    compliance        = "NDPR-2023"
  }
}

# ============================================
# MONITORING ENDPOINTS
# ============================================

output "monitoring_dashboard_url" {
  description = "GBB Cloud monitoring dashboard URL"
  value       = "https://monitoring.galaxybackbone.com/dashboards/vaxtrace"
}

# ============================================
# COST ESTIMATION
# ============================================

output "estimated_monthly_cost" {
  description = "Estimated monthly cost in NGN (approximate)"
  value = {
    postgres_primary = "₦150,000"  # m1.large + 500GB SSD
    postgres_standby = "₦150,000"  # m1.large + 500GB SSD
    redis            = "₦50,000"   # m1.medium + 50GB SSD
    network          = "₦20,000"   # Private network + router
    backups          = "₦30,000"   # Daily backups
    total            = "₦400,000/month"
  }
}

# ============================================
# NEXT STEPS
# ============================================

output "next_steps" {
  description = "Next steps after provisioning"
  value = <<-EOT
    1. Save the PostgreSQL and Redis passwords securely
    2. Update application .env file with connection strings
    3. Configure PostgreSQL streaming replication to standby
    4. Set up automated backup monitoring
    5. Configure application security groups to allow access
    6. Run database migrations on the primary instance
    7. Test failover to standby instance
    8. Set up monitoring alerts
  EOT
}

# ============================================
# VaxTrace Nigeria - Terraform Configuration
# ============================================
# Galaxy Backbone (GBB) Infrastructure as Code
# 
# This Terraform configuration provisions:
# 1. PostgreSQL with PostGIS on GBB Cloud
# 2. Redis for caching
# 3. Network security with NDPR compliance
# 4. Backup and disaster recovery setup
#
# Provider: OpenStack (GBB's underlying infrastructure)
# ============================================

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    openstack = {
      source  = "terraform-provider-openstack/openstack"
      version = "~> 1.54.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6.0"
    }
  }

  backend "s3" {
    # Store state in GBB's internal S3-compatible storage
    bucket = "vaxtrace-terraform-state"
    key    = "production/terraform.tfstate"
    region = "ng-abuja"
    
    # Encryption at rest
    encrypt = true
  }
}

# ============================================
# PROVIDER CONFIGURATION
# ============================================

provider "openstack" {
  # GBB Cloud credentials (from environment variables)
  auth_url    = var.gbb_auth_url
  domain_name = var.gbb_domain_name
  tenant_name = var.gbb_tenant_name
  user_name   = var.gbb_user_name
  password    = var.gbb_password
  
  region = var.gbb_region
}

# ============================================
# RANDOM RESOURCES
# ============================================

resource "random_password" "postgres_password" {
  length  = 32
  special = true
  override_special = "_%@"
}

resource "random_password" "redis_password" {
  length  = 32
  special = true
  override_special = "_%@"
}

# ============================================
# NETWORK CONFIGURATION
# ============================================

# Private network for VaxTrace infrastructure
resource "openstack_networking_network_v2" "vaxtrace_network" {
  name           = "vaxtrace-private-network"
  admin_state_up = true
  description    = "VaxTrace Nigeria - Private Network (NDPR Compliant)"
}

# Private subnet
resource "openstack_networking_subnet_v2" "vaxtrace_subnet" {
  name       = "vaxtrace-private-subnet"
  network_id = openstack_networking_network_v2.vaxtrace_network.id
  cidr       = var.private_subnet_cidr
  dns_nameservers = var.dns_servers
  
  # No gateway to internet (air-gapped for security)
  gateway_ip = ""  # Set to null if internet access needed
}

# Router for external access (controlled)
resource "openstack_networking_router_v2" "vaxtrace_router" {
  name                = "vaxtrace-router"
  admin_state_up      = true
  external_network_id = var.gbb_external_network_id
}

resource "openstack_networking_router_interface_v2" "vaxtrace_router_interface" {
  router_id = openstack_networking_router_v2.vaxtrace_router.id
  subnet_id = openstack_networking_subnet_v2.vaxtrace_subnet.id
}

# Security Group - PostgreSQL
resource "openstack_networking_secgroup_v2" "postgres_sg" {
  name        = "vaxtrace-postgres-sg"
  description = "Security group for PostgreSQL (NDPR compliant)"
}

# Allow access from application servers only
resource "openstack_networking_secgroup_rule_v2" "postgres_ingress" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 5432
  port_range_max    = 5432
  remote_ip_prefix  = var.app_server_cidr  # Application servers only
  security_group_id = openstack_networking_secgroup_v2.postgres_sg.id
}

# Security Group - Redis
resource "openstack_networking_secgroup_v2" "redis_sg" {
  name        = "vaxtrace-redis-sg"
  description = "Security group for Redis cache"
}

resource "openstack_networking_secgroup_rule_v2" "redis_ingress" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 6379
  port_range_max    = 6379
  remote_ip_prefix  = var.app_server_cidr
  security_group_id = openstack_networking_secgroup_v2.redis_sg.id
}

# Security Group - SSH (bastion only)
resource "openstack_networking_secgroup_rule_v2" "ssh_ingress" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  remote_ip_prefix  = var.bastion_cidr  # Bastion host only
  security_group_id = openstack_networking_secgroup_v2.postgres_sg.id
}

# ============================================
# STORAGE VOLUMES
# ============================================

# PostgreSQL primary storage
resource "openstack_blockstorage_volume_v3" "postgres_primary" {
  name                 = "vaxtrace-postgres-primary"
  size                 = var.postgres_storage_size
  volume_type          = var.postgres_storage_type  # SSD for performance
  availability_zone    = var.gbb_primary_az  # Abuja
  
  # Encryption at rest (NDPR requirement)
  encryption = true
  
  # Backup configuration
  snapshot_id = null
}

# PostgreSQL standby storage (for DR)
resource "openstack_blockstorage_volume_v3" "postgres_standby" {
  name                 = "vaxtrace-postgres-standby"
  size                 = var.postgres_storage_size
  volume_type          = var.postgres_storage_type
  availability_zone    = var.gbb_dr_az  # Kano (different zone)
  
  encryption = true
}

# Redis persistence storage
resource "openstack_blockstorage_volume_v3" "redis_persistence" {
  name              = "vaxtrace-redis-persistence"
  size              = var.redis_storage_size
  volume_type       = var.redis_storage_type
  availability_zone = var.gbb_primary_az
  
  encryption = true
}

# ============================================
# POSTGRESQL INSTANCE (Primary)
# ============================================

resource "openstack_compute_instance_v2" "postgres_primary" {
  name              = "vaxtrace-postgres-primary"
  image_name        = var.postgres_image_name
  flavor_name       = var.postgres_flavor_name
  availability_zone = var.gbb_primary_az
  
  # Network configuration
  network {
    uuid = openstack_networking_network_v2.vaxtrace_network.id
  }
  
  # Security groups
  security_groups = [
    openstack_networking_secgroup_v2.postgres_sg.name
  ]
  
  # Storage attachment
  block_device {
    uuid                  = openstack_blockstorage_volume_v3.postgres_primary.id
    source_type           = "volume"
    boot_index            = 0
    destination_type      = "volume"
    delete_on_termination = false
  }
  
  # Metadata
  metadata = {
    environment = var.environment
    project     = "vaxtrace"
    component   = "postgresql-primary"
    compliance  = "ndpr-2023"
  }
  
  # SSH key for management
  key_pair = var.ssh_key_name
}

# ============================================
# POSTGRESQL INSTANCE (Standby - DR)
# ============================================

resource "openstack_compute_instance_v2" "postgres_standby" {
  name              = "vaxtrace-postgres-standby"
  image_name        = var.postgres_image_name
  flavor_name       = var.postgres_flavor_name
  availability_zone = var.gbb_dr_az  # Kano
  
  network {
    uuid = openstack_networking_network_v2.vaxtrace_network.id
  }
  
  security_groups = [
    openstack_networking_secgroup_v2.postgres_sg.name
  ]
  
  block_device {
    uuid                  = openstack_blockstorage_volume_v3.postgres_standby.id
    source_type           = "volume"
    boot_index            = 0
    destination_type      = "volume"
    delete_on_termination = false
  }
  
  metadata = {
    environment = var.environment
    project     = "vaxtrace"
    component   = "postgresql-standby"
    compliance  = "ndpr-2023"
    dr_role     = "hot_standby"
  }
  
  key_pair = var.ssh_key_name
}

# ============================================
# REDIS INSTANCE
# ============================================

resource "openstack_compute_instance_v2" "redis" {
  name              = "vaxtrace-redis"
  image_name        = var.redis_image_name
  flavor_name       = var.redis_flavor_name
  availability_zone = var.gbb_primary_az
  
  network {
    uuid = openstack_networking_network_v2.vaxtrace_network.id
  }
  
  security_groups = [
    openstack_networking_secgroup_v2.redis_sg.name
  ]
  
  block_device {
    uuid                  = openstack_blockstorage_volume_v3.redis_persistence.id
    source_type           = "volume"
    boot_index            = 0
    destination_type      = "volume"
    delete_on_termination = false
  }
  
  metadata = {
    environment = var.environment
    project     = "vaxtrace"
    component   = "redis-cache"
    compliance  = "ndpr-2023"
  }
  
  key_pair = var.ssh_key_name
}

# ============================================
# FLOATING IPs (for management access)
# ============================================

resource "openstack_networking_floatingip_v2" "postgres_primary_fip" {
  pool = var.gbb_floating_ip_pool
}

resource "openstack_networking_floatingip_associate_v2" "postgres_primary_fip_assoc" {
  floating_ip = openstack_networking_floatingip_v2.postgres_primary_fip.address
  port_id     = openstack_compute_instance_v2.postgres_primary.network[0].port
}

# ============================================
# BACKUP CONFIGURATION
# ============================================

# Automated backup for PostgreSQL
resource "openstack_blockstorage_backup_v3" "postgres_daily_backup" {
  name        = "vaxtrace-postgres-daily-backup"
  volume_id   = openstack_blockstorage_volume_v3.postgres_primary.id
  description = "Daily backup of VaxTrace PostgreSQL database"
  
  # Incremental backup (faster)
  incremental = true
  
  # Retention: 30 days (NDPR requirement)
  snapshot_id = null
}

# ============================================
# MONITORING & ALERTING
# ============================================

# Cloud monitoring for GBB
resource "openstack_monitoring_service_v1" "postgres_monitoring" {
  name        = "vaxtrace-postgres-monitoring"
  type        = "ping"
  description = "Monitor PostgreSQL availability"
  
  check {
    host     = openstack_compute_instance_v2.postgres_primary.access_ip_v4
    port     = 5432
    type     = "tcp"
    interval = 60
    timeout  = 10
  }
}

# ============================================
# OUTPUTS
# ============================================

output "postgres_primary_ip" {
  description = "Private IP of PostgreSQL primary instance"
  value       = openstack_compute_instance_v2.postgres_primary.access_ip_v4
  sensitive   = true
}

output "postgres_standby_ip" {
  description = "Private IP of PostgreSQL standby instance"
  value       = openstack_compute_instance_v2.postgres_standby.access_ip_v4
  sensitive   = true
}

output "redis_ip" {
  description = "Private IP of Redis instance"
  value       = openstack_compute_instance_v2.redis.access_ip_v4
  sensitive   = true
}

output "postgres_password" {
  description = "PostgreSQL admin password (save securely)"
  value       = random_password.postgres_password.result
  sensitive   = true
}

output "redis_password" {
  description = "Redis password (save securely)"
  value       = random_password.redis_password.result
  sensitive   = true
}

output "network_id" {
  description = "VaxTrace private network ID"
  value       = openstack_networking_network_v2.vaxtrace_network.id
}

output "postgres_floating_ip" {
  description = "Floating IP for PostgreSQL management access"
  value       = openstack_networking_floatingip_v2.postgres_primary_fip.address
  sensitive   = true
}

# ============================================
# VaxTrace Nigeria - Terraform Variables
# ============================================
# Configuration variables for GBB infrastructure provisioning
# ============================================

# ============================================
# GALAXY BACKBONE (GBB) CREDENTIALS
# ============================================

variable "gbb_auth_url" {
  description = "GBB OpenStack authentication URL"
  type        = string
  sensitive   = true
  default     = "https://api.galaxybackbone.com:5000/v3"
}

variable "gbb_domain_name" {
  description = "GBB domain name"
  type        = string
  default     = "Default"
}

variable "gbb_tenant_name" {
  description = "GBB project/tenant name"
  type        = string
  default     = "vaxtrace-production"
}

variable "gbb_user_name" {
  description = "GBB service account username"
  type        = string
  sensitive   = true
}

variable "gbb_password" {
  description = "GBB service account password"
  type        = string
  sensitive   = true
}

variable "gbb_region" {
  description = "GBB region (Abuja or Kano)"
  type        = string
  default     = "ng-abuja"
  
  validation {
    condition     = contains(["ng-abuja", "ng-kano"], var.gbb_region)
    error_message = "Region must be either 'ng-abuja' or 'ng-kano'."
  }
}

variable "gbb_external_network_id" {
  description = "GBB external network ID for router"
  type        = string
  default     = "f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0"
}

variable "gbb_floating_ip_pool" {
  description = "GBB floating IP pool name"
  type        = string
  default     = "public"
}

# ============================================
# AVAILABILITY ZONES (Disaster Recovery)
# ============================================

variable "gbb_primary_az" {
  description = "Primary availability zone (Abuja)"
  type        = string
  default     = "abuja-zone-1"
}

variable "gbb_dr_az" {
  description = "Disaster recovery availability zone (Kano)"
  type        = string
  default     = "kano-zone-1"
}

# ============================================
# NETWORK CONFIGURATION
# ============================================

variable "private_subnet_cidr" {
  description = "CIDR block for VaxTrace private network"
  type        = string
  default     = "10.0.0.0/24"
  
  validation {
    condition     = can(cidrhost(var.private_subnet_cidr, 0))
    error_message = "Must be a valid CIDR block."
  }
}

variable "app_server_cidr" {
  description = "CIDR block for application servers (allowed to access DB)"
  type        = string
  default     = "10.0.0.0/24"
}

variable "bastion_cidr" {
  description = "CIDR block for bastion host (SSH access)"
  type        = string
  default     = "10.0.1.0/24"
}

variable "dns_servers" {
  description = "DNS servers for the private subnet"
  type        = list(string)
  default     = ["8.8.8.8", "8.8.4.4"]
}

# ============================================
# POSTGRESQL CONFIGURATION
# ============================================

variable "postgres_image_name" {
  description = "GBB image name for PostgreSQL (Ubuntu 22.04 with PostGIS)"
  type        = string
  default     = "ubuntu-22.04-postgis-16"
}

variable "postgres_flavor_name" {
  description = "GBB flavor name for PostgreSQL (CPU/RAM)"
  type        = string
  default     = "m1.large"  # 4 vCPU, 8GB RAM
  
  # Production recommendation: m1.xlarge (8 vCPU, 16GB RAM)
}

variable "postgres_storage_size" {
  description = "PostgreSQL primary storage size in GB"
  type        = number
  default     = 500  # GB
  
  validation {
    condition     = var.postgres_storage_size >= 100
    error_message = "Storage must be at least 100 GB."
  }
}

variable "postgres_storage_type" {
  description = "PostgreSQL storage type (SSD recommended)"
  type        = string
  default     = "ssd"
  
  validation {
    condition     = contains(["ssd", "hdd"], var.postgres_storage_type)
    error_message = "Storage type must be 'ssd' or 'hdd'."
  }
}

# ============================================
# REDIS CONFIGURATION
# ============================================

variable "redis_image_name" {
  description = "GBB image name for Redis (Alpine Linux)"
  type        = string
  default     = "alpine-3.19-redis"
}

variable "redis_flavor_name" {
  description = "GBB flavor name for Redis"
  type        = string
  default     = "m1.medium"  # 2 vCPU, 4GB RAM
  
  # Production recommendation: m1.large (4 vCPU, 8GB RAM)
}

variable "redis_storage_size" {
  description = "Redis persistence storage size in GB"
  type        = number
  default     = 50  # GB
  
  validation {
    condition     = var.redis_storage_size >= 10
    error_message = "Storage must be at least 10 GB."
  }
}

variable "redis_storage_type" {
  description = "Redis storage type"
  type        = string
  default     = "ssd"
}

# ============================================
# SECURITY & ACCESS
# ============================================

variable "ssh_key_name" {
  description = "SSH key pair name for instance access"
  type        = string
  default     = "vaxtrace-prod-key"
}

# ============================================
# ENVIRONMENT
# ============================================

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
  
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be 'development', 'staging', or 'production'."
  }
}

# ============================================
# BACKUP CONFIGURATION
# ============================================

variable "backup_retention_days" {
  description = "Number of days to retain backups (NDPR: 7 years = 2555 days)"
  type        = number
  default     = 2555
  
  validation {
    condition     = var.backup_retention_days >= 2555
    error_message = "NDPR requires minimum 7 years (2555 days) retention."
  }
}

variable "backup_schedule" {
  description = "Cron schedule for automated backups"
  type        = string
  default     = "0 2 * * *"  # Daily at 2 AM
}

# ============================================
# MONITORING
# ============================================

variable "enable_monitoring" {
  description = "Enable GBB cloud monitoring"
  type        = bool
  default     = true
}

variable "monitoring_alert_email" {
  description = "Email for monitoring alerts"
  type        = string
  default     = "ops@vaxtrace.ng"
}

# ============================================
# TAGS
# ============================================

variable "tags" {
  description = "Tags to apply to all resources"
  type = map(string)
  default = {
    Project     = "VaxTrace Nigeria"
    ManagedBy   = "Terraform"
    Compliance  = "NDPR-2023"
    DataSovereignty = "Nigeria"
    CostCenter  = "NPHCDA-IT"
  }
}


-- Core Database Types and Extensions
-- Version: 1.0.0
-- Phase 1.2: Database Foundation - Core Types

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable Row Level Security globally
ALTER DATABASE postgres SET row_security = on;

-- Create custom types
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
CREATE TYPE audit_event_type AS ENUM ('authentication', 'authorization', 'data_access', 'data_modification', 'system_event', 'security_event');
CREATE TYPE permission_action AS ENUM ('create', 'read', 'update', 'delete', 'manage', 'view', 'edit');

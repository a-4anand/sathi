-- Supabase installs some extensions in the `extensions` schema by default.
-- WACRM's historical migrations use uuid_generate_v4() unqualified, so keep
-- uuid-ossp in public where those migrations can resolve it.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
ALTER EXTENSION "uuid-ossp" SET SCHEMA public;

-- =============================================================================
-- SQL SECURITY & ACCESS CONTROL (POSTGRESQL ROW-LEVEL SECURITY & AUDIT)
-- =============================================================================

-- 1. WEKA ROW-LEVEL SECURITY (RLS) KWENYE MAJEDWALI YOTE YA SENSITIVE DATA
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. TENGANISHA ROLES ZA MFUMO (PRINCIPLE OF LEAST PRIVILEGE)
-- Usiruhusu app backend kutumia postgres superuser!
CREATE ROLE app_user WITH LOGIN PASSWORD 'CHANGE_THIS_TO_STRONG_SECURE_PASSWORD';
CREATE ROLE app_admin WITH LOGIN PASSWORD 'CHANGE_THIS_TO_STRONG_ADMIN_PASSWORD';
CREATE ROLE read_only_analyst WITH LOGIN PASSWORD 'CHANGE_THIS_TO_ANALYST_PASSWORD';

-- Kutoa haki za msingi
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO read_only_analyst;

-- =============================================================================
-- 3. POLICIES ZA ROW-LEVEL SECURITY (RLS)
-- =============================================================================

-- (A) POLICY YA USER_PROFILES: Mtumiaji anaona na kubadilisha Profile yake pekee
CREATE POLICY user_profile_isolation_policy ON user_profiles
    FOR ALL
    TO app_user
    USING (user_id = current_setting('app.current_user_id', true)::uuid)
    WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);

-- (B) POLICY YA TRANSACTIONS: Mtumiaji anaona miamala yake pekee
CREATE POLICY user_transactions_policy ON transactions
    FOR SELECT
    TO app_user
    USING (account_owner_id = current_setting('app.current_user_id', true)::uuid);

-- Admin anaweza kuona miamala yote
CREATE POLICY admin_transactions_policy ON transactions
    FOR ALL
    TO app_admin
    USING (true);

-- (C) POLICY YA AUDIT_LOGS: Hakuna mtu anayeweza kubadilisha au kufuta logs! (Immutable Logs)
CREATE POLICY audit_logs_read_policy ON audit_logs
    FOR SELECT
    TO app_admin
    USING (true);

CREATE POLICY audit_logs_insert_policy ON audit_logs
    FOR INSERT
    TO app_user, app_admin
    WITH CHECK (true);

-- Kuzuia UPDATE na DELETE kwenye audit_logs kikamilifu
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC, app_user, app_admin;

-- =============================================================================
-- 4. TRAP FOR PRIVILEGE ESCALATION & AUTOMATED AUDIT TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION log_sensitive_updates()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        table_name,
        operation,
        changed_by,
        old_data,
        new_data,
        created_at
    )
    VALUES (
        TG_TABLE_NAME,
        TG_OP,
        current_setting('app.current_user_id', true),
        to_jsonb(OLD),
        to_jsonb(NEW),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger ya kukagua mabadiliko ya maelezo ya watumiaji
CREATE TRIGGER audit_user_changes
    AFTER UPDATE OR DELETE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION log_sensitive_updates();

-- SQL function to ensure default profile exists
CREATE OR REPLACE FUNCTION ensure_default_profile()
RETURNS void AS $$
BEGIN
  INSERT INTO profiles (id, display_name, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', 'Default User', NOW())
  ON CONFLICT (id) DO UPDATE SET updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

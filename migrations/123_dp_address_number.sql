-- Additive: do not parse or overwrite existing free-text addresses.
ALTER TABLE candidate_dp_profiles ADD COLUMN IF NOT EXISTS address_number VARCHAR(20) NOT NULL DEFAULT '';
INSERT INTO schema_migrations(name) VALUES ('123_dp_address_number.sql') ON CONFLICT (name) DO NOTHING;

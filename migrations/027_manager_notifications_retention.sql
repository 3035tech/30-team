-- 027: index for notification retention purge (DELETE by created_at)

CREATE INDEX IF NOT EXISTS idx_manager_notifications_created_at
  ON manager_notifications (created_at ASC);

COMMENT ON INDEX idx_manager_notifications_created_at IS
  'Supports batched retention DELETE of old manager_notifications.';

INSERT INTO schema_migrations (name) VALUES ('027_manager_notifications_retention.sql')
ON CONFLICT (name) DO NOTHING;

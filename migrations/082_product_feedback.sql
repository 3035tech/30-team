-- Product feedback inbox (feature ideas / bugs / UX) from managers → super-admin review.
CREATE TABLE IF NOT EXISTS product_feedback (
  id                BIGSERIAL PRIMARY KEY,
  company_id        BIGINT REFERENCES companies(id) ON DELETE SET NULL,
  user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'new',
  message           TEXT NOT NULL,
  active_tab        TEXT NOT NULL DEFAULT '',
  active_section    TEXT NOT NULL DEFAULT '',
  contact_ok        BOOLEAN NOT NULL DEFAULT TRUE,
  admin_notes       TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_feedback_kind_chk CHECK (kind IN ('idea', 'bug', 'ux')),
  CONSTRAINT product_feedback_status_chk CHECK (status IN ('new', 'reviewing', 'done', 'dismissed')),
  CONSTRAINT product_feedback_message_len CHECK (char_length(message) BETWEEN 10 AND 4000),
  CONSTRAINT product_feedback_admin_notes_len CHECK (char_length(admin_notes) <= 4000),
  CONSTRAINT product_feedback_tab_len CHECK (char_length(active_tab) <= 80),
  CONSTRAINT product_feedback_section_len CHECK (char_length(active_section) <= 80)
);

CREATE INDEX IF NOT EXISTS idx_product_feedback_status_created
  ON product_feedback (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_feedback_company_created
  ON product_feedback (company_id, created_at DESC);

COMMENT ON TABLE product_feedback IS
  'Manager-submitted product ideas/bugs/UX notes; inbox is super-admin only.';

-- Landing page analytics tracking

CREATE TABLE IF NOT EXISTS landing_analytics (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL, -- pageview | cta_click | signup_start | signup_complete | login
  session_id TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  user_agent TEXT,
  ip_hash TEXT, -- SHA256(IP) para LGPD
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE landing_analytics IS
  'Eventos da landpage e signup funnel para análise de conversão';
COMMENT ON COLUMN landing_analytics.event_type IS
  'Tipo de evento: pageview, cta_click, signup_start, signup_complete, login';
COMMENT ON COLUMN landing_analytics.ip_hash IS
  'SHA256(IP address) para LGPD - não armazena IP real';

CREATE INDEX IF NOT EXISTS idx_landing_analytics_created
  ON landing_analytics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_landing_analytics_event
  ON landing_analytics (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_landing_analytics_session
  ON landing_analytics (session_id)
  WHERE session_id IS NOT NULL;

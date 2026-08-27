-- HR Score: núcleo de inteligência comportamental (B-1001)
-- Consolida sinais existentes em score 0-100 + predições

CREATE TABLE IF NOT EXISTS hr_scores (
  id BIGSERIAL PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Score final 0-100
  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  
  -- Breakdown por sinal (componentes do score)
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Estrutura esperada:
  -- {
  --   "profile": { "score": 85, "weight": 0.15 },
  --   "motivators": { "score": 72, "weight": 0.20 },
  --   "fit": { "score": 90, "weight": 0.15 },
  --   "pdi": { "score": 65, "weight": 0.20 },
  --   "checkins": { "score": 80, "weight": 0.15 },
  --   "climate": { "score": 75, "weight": 0.10 },
  --   "retention": { "score": 60, "weight": 0.05 }
  -- }
  
  -- Predições
  turnover_risk TEXT CHECK (turnover_risk IN ('low', 'medium', 'high')),
  turnover_reasons JSONB DEFAULT '[]'::jsonb,
  -- Array de strings: ["climate_low", "retention_watch", "pdi_delayed", etc]
  
  pdi_gap_areas JSONB DEFAULT '[]'::jsonb,
  -- Array de áreas sugeridas: [{"area": "leadership", "priority": "high"}, ...]
  
  -- Metadata
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Um score por pessoa
  UNIQUE(candidate_id)
);

COMMENT ON TABLE hr_scores IS
  'HR Score 0-100: consolidação de sinais comportamentais (T1-T9, Motivadores, Fit, PDI, check-ins, clima, retenção) + predições de risco e gaps';

COMMENT ON COLUMN hr_scores.score IS
  'Score consolidado 0-100: engajamento, aderência e potencial';

COMMENT ON COLUMN hr_scores.signals IS
  'Breakdown do score por sinal (JSONB): profile, motivators, fit, pdi, checkins, climate, retention';

COMMENT ON COLUMN hr_scores.turnover_risk IS
  'Predição de risco de saída: low, medium, high';

COMMENT ON COLUMN hr_scores.turnover_reasons IS
  'Razões do risco (array): climate_low, retention_watch, pdi_delayed, concern_checkins, etc';

COMMENT ON COLUMN hr_scores.pdi_gap_areas IS
  'Áreas de desenvolvimento sugeridas com prioridade';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_hr_scores_company ON hr_scores(company_id);

CREATE INDEX IF NOT EXISTS idx_hr_scores_score_desc ON hr_scores(company_id, score DESC);

CREATE INDEX IF NOT EXISTS idx_hr_scores_candidate ON hr_scores(candidate_id);

CREATE INDEX IF NOT EXISTS idx_hr_scores_risk ON hr_scores(company_id, turnover_risk)
  WHERE turnover_risk IN ('medium', 'high');

CREATE INDEX IF NOT EXISTS idx_hr_scores_calculated ON hr_scores(calculated_at DESC);

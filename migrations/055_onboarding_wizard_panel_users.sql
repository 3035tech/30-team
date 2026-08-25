-- Wizard “Primeiros passos” é só para cohort /signup (early access).
-- Usuários do painel / legado ficaram com onboarding_completed = FALSE após 053
-- e viam o modal de early access por engano.

UPDATE users
SET
  onboarding_completed = TRUE,
  onboarding_completed_at = COALESCE(onboarding_completed_at, NOW())
WHERE deleted = FALSE
  AND onboarding_completed = FALSE
  AND signup_source IS NULL
  AND signup_metadata IS NULL
  AND signup_pending = FALSE;

COMMENT ON COLUMN users.onboarding_completed IS
  'TRUE = concluiu/pulou o wizard OU nunca precisou (painel/legado). FALSE só faz sentido para self-service /signup ainda sem wizard.';

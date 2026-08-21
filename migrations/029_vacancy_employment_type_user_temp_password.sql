-- Formato de contratação na vaga + flag de troca de senha no 1º acesso
ALTER TABLE vacancies
  ADD COLUMN IF NOT EXISTS employment_type TEXT;

COMMENT ON COLUMN vacancies.employment_type IS
  'internship | clt | pj | cooperative | NULL';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN users.must_change_password IS
  'TRUE após criação com senha temporária — obriga troca no próximo login.';

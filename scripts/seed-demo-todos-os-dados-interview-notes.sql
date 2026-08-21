-- =============================================================================
-- Patch: anotações de entrevista ricas — vaga Fullstack (Todos os Dados)
-- Idempotente. Rode no pgAdmin sem precisar recriar o tenant.
-- =============================================================================

UPDATE vacancy_candidates vc
SET interview_notes = n.notes,
    updated_at = NOW()
FROM candidates c,
LATERAL (
  SELECT CASE LOWER(TRIM(c.email))
    WHEN 'pedro@todos-os-dados.demo' THEN
      $html$
<p><strong>Entrevista 1 (screening) — 13/08.</strong></p>
<ul>
<li>Stack: Node, React, Postgres; falou com clareza de índices e N+1.</li>
<li>Case: migração de conciliação com idempotência; perguntou trade-offs.</li>
<li>Fit cultural: perfil analítico (T5); gosta de aprofundar antes de commit.</li>
</ul>
<p><strong>Pontos positivos:</strong> raciocínio estruturado, curiosidade técnica, pretensão alinhada (R$ 18,5k).</p>
<p><strong>Atenção:</strong> pode alongar análise — explorar ritmo de sprint com o time do cliente.</p>
<p><strong>Próximo passo:</strong> avançar para entrevista técnica com o cliente.</p>
$html$
    WHEN 'marina@todos-os-dados.demo' THEN
      $html$
<p><strong>Entrevista 1 — 15/08 (agendada / em andamento).</strong></p>
<ul>
<li>Indicação interna; disponibilidade em até 15 dias.</li>
<li>Perfil executor (T3): foco em entrega e meta.</li>
<li>Experiência em produto digital; menos profundidade em SQL avançado.</li>
</ul>
<p><strong>Pontos positivos:</strong> comunicação objetiva, energia de entrega, pretensão R$ 17k ok.</p>
<p><strong>Atenção:</strong> validar se prioriza velocidade sobre processo/documentação.</p>
<p><strong>Próximo passo:</strong> concluir entrevista e decidir se entra na shortlist “conversar”.</p>
$html$
    WHEN 'gustavo@todos-os-dados.demo' THEN
      $html$
<p><strong>Entrevista 1 — 08/08.</strong></p>
<ul>
<li>Portal de vagas; disponibilidade imediata.</li>
<li>Perfil T6 — cauteloso; boa postura, porém gaps em settlement e filas.</li>
<li>Exercício técnico: dificuldade em modelar idempotência e retry.</li>
</ul>
<p><strong>Decisão:</strong> reprovado por <em>skill_gap</em> (fit técnico insuficiente para a vaga).</p>
<p><strong>Feedback interno:</strong> candidato educado; possível banco para vagas mais operacionais no futuro.</p>
$html$
    WHEN 'nina@todos-os-dados.demo' THEN
      $html$
<p><strong>Pré-cadastro / screening inicial — 19/08.</strong></p>
<ul>
<li>Contato frio (fonte: outro); disponibilidade imediata.</li>
<li>Perfil T2 — colaborativo; ainda sem Motivadores respondidos.</li>
<li>Convite de Eneagrama: <strong>enviado</strong>; aguardando abertura do link.</li>
</ul>
<p><strong>Notas da call rápida (15 min):</strong> interesse genuíno na vaga; experiência mid em front; backend mais raso.</p>
<p><strong>Próximo passo:</strong> aguardar conclusão do teste + enviar Motivadores; só então marcar entrevista estruturada.</p>
$html$
    WHEN 'lara@todos-os-dados.demo' THEN
      $html$
<p><strong>Entrevista 1 + 2 — triagem e aprovação interna.</strong></p>
<ul>
<li>Agência; pretensão R$ 19k; disponibilidade 30 dias.</li>
<li>Perfil T1 — qualidade e processo; excelente para compliance de plataforma.</li>
<li>Case: revisão de PR e checklist de release; documentação clara.</li>
</ul>
<p><strong>Pontos positivos:</strong> disciplina, alinhamento à rubrica (T1), maturidade de entrega.</p>
<p><strong>Atenção:</strong> pode travar com times muito “atalho” — explorar no cliente.</p>
<p><strong>Status:</strong> aprovada internamente; pronta para shortlist do relatório ao cliente.</p>
$html$
    WHEN 'otavio@todos-os-dados.demo' THEN
      $html$
<p><strong>Pós-teste (test_completed) — 16/08.</strong></p>
<ul>
<li>LinkedIn; Recife; disponibilidade 60 dias (mais longo).</li>
<li>Perfil T7 — exploração e ritmo; teste ok, entrevista ainda não marcada.</li>
<li>Motivadores: flexibilidade / criatividade / crescimento.</li>
</ul>
<p><strong>Leitura:</strong> banco por ora — timing de disponibilidade e menor aderência à rubrica (T5/T1/T6).</p>
<p><strong>Próximo passo:</strong> manter em banco; reavaliar se a shortlist principal não fechar.</p>
$html$
    WHEN 'ricardo@todos-os-dados.demo' THEN
      $html$
<p><strong>Processo encerrado (arquivado) — 01/08.</strong></p>
<ul>
<li>Indicação; pretensão acima do teto da vaga (R$ 21k).</li>
<li>Perfil T8 — liderança forte; excesso de seniority para a abertura atual.</li>
</ul>
<p><strong>Motivo do arquivo:</strong> desalinhamento de escopo/senioridade e expectativa salarial.</p>
<p><strong>Nota:</strong> não reabrir nesta vaga; eventual fit em papel de tech lead futuro.</p>
$html$
    ELSE NULL
  END AS notes
) n
WHERE vc.candidate_id = c.id
  AND c.company_id = (
    SELECT id FROM companies
    WHERE LOWER(slug) = 'todos-os-dados-demo' AND deleted = FALSE
    LIMIT 1
  )
  AND n.notes IS NOT NULL;

-- Confirmação rápida
SELECT c.full_name, c.email,
       LEFT(regexp_replace(COALESCE(vc.interview_notes, ''), '<[^>]+>', ' ', 'g'), 80) AS notes_preview
FROM vacancy_candidates vc
JOIN candidates c ON c.id = vc.candidate_id
JOIN companies co ON co.id = c.company_id
WHERE LOWER(co.slug) = 'todos-os-dados-demo'
ORDER BY c.full_name;

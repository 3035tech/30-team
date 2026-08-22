# Backlog — 30Team

Ideias de funcionalidades **ainda não implementadas**.

## Como usar (humano + agente)

| Ação | O que fazer |
|------|-------------|
| Nova ideia | Usuário pede → agente **adiciona** item (id estável + instruções) |
| Implementada | Ao entregar → **remover** o item deste arquivo (não riscar) |
| Em andamento | Mover para “Em andamento” com nota de branch/PR se houver |
| Epic grande | Manter sub-itens; ao fechar um sub-item, apagar só ele; apagar o epic quando todos os filhos sumirem |

Não usar para bugs pontuais. Aqui só **produto / capacidade nova**.

**Antes de implementar qualquer item:** ler `AGENTS.md`, reutilizar o que já existe, rodar Dev → Test → Validate, atualizar README/Guia quando houver uso novo.

---

## Aberto — qualidade / testes

_(vazio — B-001–B-006 entregues)_

---

## Aberto — Epic B-100 (SEO / distribuição pública)

_(entregue — ver `docs/job-seo-and-distribution.md`. Inclui agregadores B-119 e logo empresa via S3.)_

---

## Aberto — performance (audit dashboard)

### B-202 — (opcional) caps/API restantes do audit
Já entregue na maior parte: vac-n1 LATERAL, export cap, purge batches, AE analytics sample, notify unnest, email unique idx (025), compat/leadership caps. Revisitar só se métricas de produção pedirem.

---

## Em andamento

_(vazio)_

---

## Notas

- Qualidade/testes **B-001–B-006** entregues.
- Epic **B-100** fechado (SEO, funil, referral, job alerts, agregadores, logo S3).
- **Logo S3:** código pronto; falta só credenciais de produção (`S3_BUCKET` + chaves — ver `.env.example`).

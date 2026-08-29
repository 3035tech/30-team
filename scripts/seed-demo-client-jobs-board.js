/**
 * Seed DEMO — board público /jobs para demos com clientes
 *
 * Cria 10 empresas isoladas (slug demo-board-*) + 50 vagas abertas com
 * descrição HTML completa, página pública indexável e rubrica leve.
 * Não apaga Todos os Dados / Eval / 30pay.
 *
 * Uso:
 *   CONFIRM_DEMO_PURGE=1 npm run db:seed-demo-client-jobs-board
 *   # ou: CONFIRM_DEMO_PURGE=1 node --env-file=.env scripts/seed-demo-client-jobs-board.js
 *
 * Login opcional por empresa: hr@{slug}.demo / DemoBoard!2026 (role hr)
 */

import crypto from 'node:crypto';
import process from 'node:process';
import { createRequire } from 'node:module';
import { getPgBaseConfig } from '../lib/pg-config.js';
import { sanitizeRichTextHtml } from '../lib/sanitize-html.js';

const require = createRequire(import.meta.url);
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const SLUG_PREFIX = 'demo-board-';
const PASSWORD = process.env.DEMO_BOARD_PASSWORD || 'DemoBoard!2026';
const SOURCE = 'demo_client_jobs_board';

/** 10 empresas fictícias (setor + cidade). */
const COMPANIES = [
  {
    key: 'nortech',
    name: 'NorTech Sistemas',
    city: 'São Paulo',
    state: 'SP',
    about:
      '<p><strong>NorTech</strong> constrói plataformas B2B de dados. Cultura de engenharia forte e produto contínuo.</p>',
  },
  {
    key: 'aurora',
    name: 'Aurora Saúde Digital',
    city: 'Curitiba',
    state: 'PR',
    about:
      '<p><strong>Aurora</strong> conecta clínicas e pacientes com telemedicina e prontuário leve.</p>',
  },
  {
    key: 'orbit',
    name: 'Órbita Logística',
    city: 'Campinas',
    state: 'SP',
    about:
      '<p><strong>Órbita</strong> opera last-mile e torre de controle para e-commerce regional.</p>',
  },
  {
    key: 'folha',
    name: 'Folha Verde Alimentos',
    city: 'Porto Alegre',
    state: 'RS',
    about:
      '<p><strong>Folha Verde</strong> distribui hortifruti com rastreio e app para varejo.</p>',
  },
  {
    key: 'atlas',
    name: 'Atlas Finanças',
    city: 'Rio de Janeiro',
    state: 'RJ',
    about:
      '<p><strong>Atlas</strong> oferece crédito PME com scoring comportamental e onboarding digital.</p>',
  },
  {
    key: 'lumen',
    name: 'Lumen Educação',
    city: 'Belo Horizonte',
    state: 'MG',
    about:
      '<p><strong>Lumen</strong> cria trilhas de aprendizagem corporativa e LMS white-label.</p>',
  },
  {
    key: 'vento',
    name: 'Vento Energia',
    city: 'Recife',
    state: 'PE',
    about:
      '<p><strong>Vento</strong> opera parques eólicos e monitoramento IoT de ativos.</p>',
  },
  {
    key: 'pixel',
    name: 'Pixel & Co. Design',
    city: 'Florianópolis',
    state: 'SC',
    about:
      '<p><strong>Pixel & Co.</strong> estúdio de produto digital para fintechs e healthtechs.</p>',
  },
  {
    key: 'campo',
    name: 'Campo Seguro Seguros',
    city: 'Goiânia',
    state: 'GO',
    about:
      '<p><strong>Campo Seguro</strong> oferece seguros rurais e app de sinistros com IA assistida.</p>',
  },
  {
    key: 'nexus',
    name: 'Nexus Retail',
    city: 'Brasília',
    state: 'DF',
    about:
      '<p><strong>Nexus</strong> unifica estoque omnichannel e PDV para redes regionais.</p>',
  },
];

/**
 * 5 papéis × 10 empresas = 50 vagas.
 * Templates recebem interpolação {{company}} / {{city}} / {{state}}.
 */
const ROLE_TEMPLATES = [
  {
    title: 'Engenheiro(a) Fullstack',
    slugPart: 'engenheiro-fullstack',
    employmentType: 'clt',
    modality: 'hybrid',
    salaryMin: '12000',
    salaryMax: '19000',
    rubric: { 5: 3, 1: 2, 6: 2, 3: 1 },
    body: `
<p><strong>Sobre a vaga</strong></p>
<p>Na <strong>{{company}}</strong> você vai evoluir o produto principal (web + APIs) com time enxuto e ciclos curtos.</p>
<p><strong>Responsabilidades</strong></p>
<ul>
<li>Desenvolver features end-to-end (UI React + API Node/Postgres)</li>
<li>Participar de desenho técnico, code review e documentação leve</li>
<li>Monitorar qualidade (testes, índices, performance de listagens)</li>
<li>Colaborar com produto e suporte em incidentes de prioridade alta</li>
</ul>
<p><strong>Requisitos</strong></p>
<ul>
<li>Experiência sólida com TypeScript/JavaScript e SQL</li>
<li>Familiaridade com Git, CI e deploy em containers</li>
<li>Comunicação clara em português; inglês técnico para leitura</li>
</ul>
<p><strong>Diferenciais</strong></p>
<ul>
<li>Next.js / App Router, Postgres avançado, observabilidade</li>
<li>Experiência em produto multi-tenant ou B2B SaaS</li>
</ul>
<p><strong>Local</strong>: {{modalityLabel}} · {{city}}, {{state}}. Benefícios: VR/VA, plano de saúde, home office parcial.</p>`,
  },
  {
    title: 'Product Designer (UX/UI)',
    slugPart: 'product-designer',
    employmentType: 'clt',
    modality: 'hybrid',
    salaryMin: '9000',
    salaryMax: '15000',
    rubric: { 4: 3, 9: 2, 2: 2, 7: 1 },
    body: `
<p><strong>Sobre a vaga</strong></p>
<p>Desenhe experiências claras para gestores e usuários finais da <strong>{{company}}</strong>.</p>
<p><strong>Responsabilidades</strong></p>
<ul>
<li>Pesquisar fluxos, prototipar em Figma e validar com stakeholders</li>
<li>Manter design system e critérios de acessibilidade básicos</li>
<li>Trabalhar lado a lado com engenharia na implementação</li>
<li>Documentar decisões de UX sem jargão desnecessário</li>
</ul>
<p><strong>Requisitos</strong></p>
<ul>
<li>Portfólio com produtos digitais (web ou app)</li>
<li>Domínio de Figma e handoff para desenvolvimento</li>
<li>Capacidade de priorizar com dados e feedback de suporte</li>
</ul>
<p><strong>Diferenciais</strong></p>
<ul>
<li>Experiência em RH Tech, fintech ou saúde</li>
<li>Motion leve / prototipação de microinterações</li>
</ul>
<p><strong>Local</strong>: {{modalityLabel}} · {{city}}, {{state}}.</p>`,
  },
  {
    title: 'Analista de Dados',
    slugPart: 'analista-dados',
    employmentType: 'clt',
    modality: 'remote',
    salaryMin: '8000',
    salaryMax: '13000',
    rubric: { 5: 3, 1: 3, 6: 2 },
    body: `
<p><strong>Sobre a vaga</strong></p>
<p>Transforme dados operacionais da <strong>{{company}}</strong> em indicadores acionáveis para a diretoria.</p>
<p><strong>Responsabilidades</strong></p>
<ul>
<li>Modelar métricas (funil, retenção, operação) e dashboards</li>
<li>Escrever SQL confiável; documentar definições de KPI</li>
<li>Apoiar experimentos e análises ad hoc com hedging (“há indícios”)</li>
<li>Garantir qualidade de dados com checks simples</li>
</ul>
<p><strong>Requisitos</strong></p>
<ul>
<li>SQL avançado e Excel/Sheets confortável</li>
<li>Experiência com BI (Metabase, Looker, Power BI ou similar)</li>
<li>Senso crítico para questionar a qualidade da fonte</li>
</ul>
<p><strong>Diferenciais</strong></p>
<ul>
<li>Python para ETL leve; dbt; conhecimento de produto digital</li>
</ul>
<p><strong>Local</strong>: Remoto (Brasil) · base {{city}}, {{state}}.</p>`,
  },
  {
    title: 'Customer Success / Contas',
    slugPart: 'customer-success',
    employmentType: 'clt',
    modality: 'hybrid',
    salaryMin: '6000',
    salaryMax: '10000',
    rubric: { 2: 3, 9: 2, 6: 2, 3: 1 },
    body: `
<p><strong>Sobre a vaga</strong></p>
<p>Cuide da saúde da carteira e da adoção do produto na <strong>{{company}}</strong>.</p>
<p><strong>Responsabilidades</strong></p>
<ul>
<li>Onboarding de novos clientes e ritmos de QBR</li>
<li>Identificar risco de churn e acionar produto/engenharia</li>
<li>Traduzir feedback em backlog priorizado</li>
<li>Manter CRM e playbooks atualizados</li>
</ul>
<p><strong>Requisitos</strong></p>
<ul>
<li>Experiência em CS, contas ou suporte B2B</li>
<li>Organização e comunicação escrita excelente</li>
<li>Facilidade com métricas de adoção e NPS/eNPS</li>
</ul>
<p><strong>Diferenciais</strong></p>
<ul>
<li>Conhecimento do setor da {{company}}; inglês intermediário</li>
</ul>
<p><strong>Local</strong>: {{modalityLabel}} · {{city}}, {{state}}.</p>`,
  },
  {
    title: 'Tech Lead / Eng. de Software Sênior',
    slugPart: 'tech-lead',
    employmentType: 'pj',
    modality: 'remote',
    salaryMin: '18000',
    salaryMax: '28000',
    rubric: { 8: 2, 5: 2, 1: 2, 3: 2, 6: 1 },
    body: `
<p><strong>Sobre a vaga</strong></p>
<p>Lidere tecnicamente um squad na <strong>{{company}}</strong>: arquitetura pragmática, mentoria e entrega previsível.</p>
<p><strong>Responsabilidades</strong></p>
<ul>
<li>Definir padrões de código, revisão e qualidade</li>
<li>Quebrar épicos em entregas; negociar trade-offs com produto</li>
<li>Garantir observabilidade, segurança básica e performance</li>
<li>Mentorar mid/juniors sem microgerenciar</li>
</ul>
<p><strong>Requisitos</strong></p>
<ul>
<li>Histórico como sênior/lead em produto digital</li>
<li>Domínio de backend e conforto com frontend moderno</li>
<li>Experiência com Postgres, filas e APIs públicas</li>
</ul>
<p><strong>Diferenciais</strong></p>
<ul>
<li>People management leve; hiring; domínio de RH Tech / fintech</li>
</ul>
<p><strong>Contrato</strong>: PJ · Remoto (Brasil). Base {{city}}, {{state}}.</p>`,
  },
];

const MODALITY_LABEL = {
  hybrid: 'Híbrido',
  remote: 'Remoto',
  onsite: 'Presencial',
};

function slugify(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function fillTemplate(tpl, vars) {
  return String(tpl || '').replace(/\{\{(\w+)\}\}/g, (_, k) =>
    vars[k] != null ? String(vars[k]) : ''
  );
}

async function purgeBoardCompanies(client) {
  const { rows } = await client.query(
    `SELECT id, slug FROM companies
     WHERE deleted = FALSE AND LOWER(slug) LIKE $1
     ORDER BY id`,
    [`${SLUG_PREFIX}%`]
  );
  for (const row of rows) {
    const companyId = row.id;
    process.stdout.write(`↻ Purge ${row.slug} (id=${companyId})…\n`);
    await client.query(`DELETE FROM manager_notifications WHERE company_id = $1`, [companyId]);
    await client.query(
      `DELETE FROM vacancy_rubrics r USING vacancies v WHERE r.vacancy_id = v.id AND v.company_id = $1`,
      [companyId]
    );
    await client.query(
      `DELETE FROM vacancy_links l USING vacancies v WHERE l.vacancy_id = v.id AND v.company_id = $1`,
      [companyId]
    );
    await client.query(`DELETE FROM vacancies WHERE company_id = $1`, [companyId]);
    await client.query(`DELETE FROM users WHERE company_id = $1`, [companyId]);
    await client.query(`DELETE FROM companies WHERE id = $1`, [companyId]);
  }
}

async function main() {
  if (process.env.CONFIRM_DEMO_PURGE !== '1') {
    console.error(`
ABORTADO — seed demo-board apaga apenas empresas slug LIKE '${SLUG_PREFIX}%'.

Para confirmar:
  CONFIRM_DEMO_PURGE=1 npm run db:seed-demo-client-jobs-board
`);
    process.exit(1);
  }

  const cfg = getPgBaseConfig();
  const client = new Client(cfg);
  await client.connect();
  const hash = await bcrypt.hash(PASSWORD, 10);

  try {
    await client.query('BEGIN');
    await purgeBoardCompanies(client);

    let companyCount = 0;
    let vacancyCount = 0;

    for (const co of COMPANIES) {
      const slug = `${SLUG_PREFIX}${co.key}`;
      const domain = `${slug}.demo`;
      const aboutHtml = sanitizeRichTextHtml(co.about, 8000);

      const insCo = await client.query(
        `INSERT INTO companies (name, slug, active, deleted, website, about_html)
         VALUES ($1, $2, TRUE, FALSE, $3, $4)
         RETURNING id`,
        [co.name, slug, `https://${co.key}.example`, aboutHtml]
      );
      const companyId = insCo.rows[0].id;
      companyCount += 1;

      await client.query(
        `INSERT INTO users (company_id, name, email, password_hash, role, active, deleted)
         VALUES ($1, $2, $3, $4, 'hr', TRUE, FALSE)`,
        [companyId, `RH ${co.name}`, `hr@${domain}`, hash]
      );

      for (const role of ROLE_TEMPLATES) {
        const title = `${role.title}: ${co.name.split(' ')[0]}`;
        const vacSlug = slugify(`${role.slugPart}-${co.key}`);
        const html = sanitizeRichTextHtml(
          fillTemplate(role.body, {
            company: co.name,
            city: co.city,
            state: co.state,
            modalityLabel: MODALITY_LABEL[role.modality] || role.modality,
          }),
          12000
        );

        const vac = await client.query(
          `INSERT INTO vacancies (
             company_id, title, slug, status, positions_count, target_date, deleted,
             description, salary_min, salary_max, client_report_show_salary,
             employment_type, workplace_modality, workplace_city, workplace_state,
             public_page_enabled, public_allow_index
           ) VALUES (
             $1, $2, $3, 'open', $4, (CURRENT_DATE + ($5 || ' days')::interval)::date, FALSE,
             $6, $7, $8, TRUE,
             $9, $10, $11, $12,
             TRUE, TRUE
           ) RETURNING id`,
          [
            companyId,
            title,
            vacSlug,
            1 + (vacancyCount % 3),
            String(14 + (vacancyCount % 45)),
            html,
            role.salaryMin,
            role.salaryMax,
            role.employmentType,
            role.modality,
            role.modality === 'remote' ? null : co.city,
            role.modality === 'remote' ? null : co.state,
          ]
        );
        const vacancyId = vac.rows[0].id;
        vacancyCount += 1;

        await client.query(
          `INSERT INTO vacancy_links (vacancy_id, token, active, expires_at, require_candidate_email)
           VALUES ($1, $2, TRUE, NOW() + INTERVAL '120 days', TRUE)`,
          [vacancyId, crypto.randomBytes(24).toString('hex')]
        );

        await client.query(
          `INSERT INTO vacancy_rubrics (vacancy_id, desired_type_weights, notes)
           VALUES ($1, $2::jsonb, $3)
           ON CONFLICT (vacancy_id) DO UPDATE SET
             desired_type_weights = EXCLUDED.desired_type_weights,
             notes = EXCLUDED.notes,
             updated_at = NOW()`,
          [
            vacancyId,
            JSON.stringify(role.rubric),
            `<p>Rubrica demo ${role.title} · ${co.name}.</p>`,
          ]
        );
      }
    }

    await client.query(
      `INSERT INTO audit_log (actor_user_id, action, target_type, target_id, metadata)
       VALUES (NULL, $1, 'seed', NULL, $2::jsonb)`,
      [
        SOURCE,
        JSON.stringify({
          companies: companyCount,
          vacancies: vacancyCount,
          slugPrefix: SLUG_PREFIX,
        }),
      ]
    );

    await client.query('COMMIT');

    console.log('');
    console.log('  DEMO board /jobs pronto');
    console.log(`  Empresas: ${companyCount} (slug ${SLUG_PREFIX}*)`);
    console.log(`  Vagas públicas abertas: ${vacancyCount}`);
    console.log('  Abrir: /jobs  (busca + filtros + avisos)');
    console.log(`  Login exemplo: hr@${SLUG_PREFIX}nortech.demo / ${PASSWORD}`);
    console.log('');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('seed-demo-client-jobs-board failed:', err.message || err);
  process.exit(1);
});

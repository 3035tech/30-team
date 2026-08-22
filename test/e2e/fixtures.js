/** Tokens / creds alinhados ao seed demo Todos os Dados (DTOV). */

export const TOK = {
  company: 'd0d0todosdadose5f60718293a4b5c6d7e8f01',
  vacancyOpen: 'e1e1todosdadose5f60718293a4b5c6d7e8f02',
  report: 'a3a3todosdadose5f60718293a4b5c6d7e8f04a3a3todosdadose5f60718',
  aeInvite: 'b4b4todosdadose5f60718293a4b5c6d7e8f05',
};

export const HR = {
  email: 'hr@todos-os-dados.demo',
  password: process.env.DEMO_TODOS_PASSWORD || 'DemoTodosDados!2026',
};

export const PUBLIC = {
  /** Legado — Playwright segue redirect 308 para /j/{slug}-{id}. */
  vagaOpen: '/vaga/todos-os-dados-demo/engenheiro-fullstack-plataforma',
  vagaClosed: '/vaga/todos-os-dados-demo/analista-dados-encerrada',
  vagasIndex: '/j',
};

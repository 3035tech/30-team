# Privacidade e LGPD — notas internas (30Team)

Documento operacional para equipe de produto e engenharia. **Não substitui parecer jurídico** nem política de privacidade voltada ao público.

## Superfície de dados

- **Landing e formulário público** (`/`, links `/t/[token]`, `/v/[token]`): coleta nome, email opcional, consentimento explícito (`consent === true` na API), respostas do assessment e metadados técnicos habituais (IP limitado por rate limit na API).
- **Dashboard e APIs admin**: dados de candidatos, assessments, empresas e usuários gestores — **atrás de autenticação** (middleware + papel).

## Retenção

- O job/script de retenção deve respeitar **`RETENTION_DAYS`** (ver `.env.example`): remoção ou anonimização de assessments antigos e candidatos órfãos conforme implementação atual do repositório.
- Ajustar o número conforme contrato com cliente e política corporativa; registrar mudanças em changelog interno.

## Bases legais (orientação típica — validar com jurídico)

| Contexto | Base frequentemente aplicável |
|----------|-------------------------------|
| Gestão de conta gestor / dashboard | Execução de contrato ou legítimo interesse (conforme caso) |
| Formulário público com consentimento marcado | Consentimento do titular |
| Obrigações fiscais/regulatórias | Obrigação legal |

## Direitos do titular

Garantir processo interno (canal definido com cliente/RH) para:

- **Confirmação e acesso** aos dados tratados  
- **Correção** de dados inexatos  
- **Anonimização, bloqueio ou eliminação** desnecessários ou excessivos  
- **Portabilidade** (quando aplicável)  
- **Revogação do consentimento** e informação sobre consequências  

Implementação técnica: exclusões em cascata onde houver `ON DELETE CASCADE`; auditoria quando existir `audit` em ações sensíveis.

## Cookies, analytics e consentimento

- Hoje o app não depende de cookies de terceiros na landing para funcionamento básico (sessão gestor é cookie HTTP-only da própria app).
- **Se** forem adicionados analytics/marketing de terceiros na landing: avaliar banner de cookies, consentimento prévio onde exigido e atualização da política de privacidade pública.

## SEO / URLs sensíveis

- Rotas com token (`/t/…`, `/v/…`) exportam **`robots: noindex`** para reduzir indexação acidental de URLs únicas.

## Tabela legada `results`

- Escrita em `results` é **desaconselhada** para o modelo multi-empresa (colisão global por nome). Preferir sempre `assessments` + `candidates`. Ver `LEGACY_RESULTS_WRITE` em `.env.example`.

## Headers de segurança (produção HTTPS)

- CSP em modo relatório e HSTS podem ser habilitados por variáveis de ambiente (ver `.env.example`). Ajustar CSP ao stack real antes de migrar para política aplicada (`Content-Security-Policy`).

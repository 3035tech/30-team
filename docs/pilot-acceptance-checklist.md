# Checklist de aceite do piloto

Execute este roteiro em staging com uma empresa de teste antes de liberar um piloto. Não use dados pessoais reais.

## Identidade e isolamento

- Entrar como RH e confirmar que o seletor/contexto mostra a empresa esperada.
- Manipular `companyId` em uma chamada do Analytics e confirmar que RH continua vendo apenas sua empresa.
- Trocar de empresa somente com um usuário que possua o vínculo e confirmar que listas, métricas e atalhos mudam juntos.
- Confirmar que logout invalida o acesso ao painel.

## Fluxo principal de recrutamento

- Criar uma vaga a partir de um funil salvo, publicar e abrir sua página pública.
- Cadastrar um candidato e concluir a avaliação por link público.
- Conferir ranking, mover o card pelo Kanban e registrar entrevista/anotação.
- Contratar a pessoa e confirmar sua entrada na Equipe, com vaga e data de contratação preservadas.

## Pessoas e desenvolvimento

- Abrir a ficha da pessoa, registrar 1:1 e criar um item de PDI.
- Conferir acesso do colaborador, Academy/LMS e notificações aplicáveis aos módulos habilitados.
- Registrar clima ou pulso somente com massa anônima de teste.

## Relatórios

- Abrir Métricas, Tendências e Comparar; conferir período, amostra e última atualização.
- Confirmar que métrica sem amostra aparece como indisponível, não como zero.
- Usar o drill-down dos cards para voltar à lista de Vagas ou Equipe.
- Exportar a visão e confirmar que o arquivo contém apenas a empresa ativa.

## Operação

- Antes do deploy: `npm run release:pilot-check`.
- Depois do deploy: `PILOT_SMOKE_BASE_URL=https://host npm run release:post-deploy-smoke`.
- Para checks autenticados, fornecer `PILOT_SMOKE_COOKIE` por secret temporário; nunca registrar ou commitar o cookie.
- Confirmar health check, logs JSON com `requestId`, alertas de operação e rollback da imagem anterior.

## Critério de saída

O piloto pode iniciar quando o pipeline da imagem estiver verde, o smoke implantado passar e não houver acesso cross-tenant, erro bloqueante ou dado real usado na prova.

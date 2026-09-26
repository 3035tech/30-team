# P1 — decisões de modelagem

Antes de adicionar um campo: avaliar identidade própria, cardinalidade, integridade referencial, filtros/índices, ciclo de edição, histórico e necessidade de cadastro. JSONB não substitui uma relação conhecida; TEXT não substitui um domínio controlado.

| Migração | Decisão | Motivo |
| --- | --- | --- |
| 126 | Descrições e versões em primeira pessoa em TEXT | Prosa livre, sem identidade ou cadastro independente; snapshots preservam o texto usado na avaliação. |
| 127 / 132 | Tabela de eventos do formato de trabalho | Relação 1:N com pessoa, data efetiva, instante e autor distintos. Formatos são TEXT + CHECK para CLT, estágio, cooperado e PJ; não há cadastro de formatos. |
| 128 / 131 | Competências do ciclo em tabela relacionada | Relação ciclo–competência, ordem, unicidade e FKs compostas por empresa. Nome/descrições ficam congelados na própria relação. JSONB foi removido do modelo de instalações novas. |
| 129 | Categorias em tabela por empresa | Cadastro editável, ativação/inativação, busca, unicidade e vínculo com competências. Não é enum fixo nem texto livre na competência. |
| 130 | Perguntas e respostas em tabelas distintas | Pergunta tem ID e ordem; resposta referencia pergunta e respondente. PK impede resposta duplicada. API valida que a pergunta pertence ao ciclo daquele respondente. |
| 130 | Escala em TEXT com CHECK | Duas modalidades fixas da aplicação, sem cadastro gerenciável. CHECK impede valores desconhecidos; enum PostgreSQL não acrescenta benefício neste domínio pequeno. |

Os JSONs retornados pelas APIs são projeções das tabelas; não implicam armazenamento JSONB. A migração 131 importa uma única vez os snapshots do rascunho local anterior, sem sobrescrever relações existentes. A coluna antiga não é removida em bancos que já a possuem. Não fazer rollback para o aplicativo anterior após novas gravações sem sincronizar os dados; reter tabelas e snapshots permite recuperação. Nenhuma migração foi aplicada em produção neste trabalho.

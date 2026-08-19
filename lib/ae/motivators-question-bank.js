/**
 * Banco de Motivadores — itens indiretos (situações e preferências).
 * Dimensões ficam só nos pesos internos. O respondente não vê nomes de motivadores.
 *
 *  - forced_choice: 1 entre 4 situações socialmente semelhantes
 *  - ranking: mais → menos o que influencia satisfação
 *  - likert: afirmação situacional (discordo ↔ concordo)
 */

/** @type {Array<{ stem: string, category: string, options: Array<{ text: string, weights: Record<string, number> }> }>} */
const FORCED_TEMPLATES = [
  {
    stem: 'Ao encerrar um projeto que deu certo, o que mais faria a experiência valer a pena para você?',
    category: 'fechamento',
    options: [
      { text: 'Ver o efeito concreto no bolso — um extra alinhado ao resultado.', weights: { financeiro: 4, reconhecimento: 1 } },
      { text: 'Assumir na sequência algo com mais alcance e responsabilidade.', weights: { crescimento: 4, lideranca: 2 } },
      { text: 'Alguém do time ou da gestão nomear, com clareza, o que você entregou.', weights: { reconhecimento: 4, relacionamentos: 1 } },
      { text: 'Já ter na mesa um problema novo, mais difícil que o anterior.', weights: { desafio: 4, autonomia: 1 } },
    ],
  },
  {
    stem: 'Duas rotinas possíveis no mesmo cargo. Qual tende a ser mais sustentável para você no dia a dia?',
    category: 'rotina',
    options: [
      { text: 'Saber com antecedência o que vem pela frente e poucos sustos de última hora.', weights: { seguranca: 4, equilibrio: 1 } },
      { text: 'Combinar o trabalho com compromissos pessoais sem precisar estar sempre à disposição.', weights: { equilibrio: 4, flexibilidade: 2 } },
      { text: 'Poder ajustar horário e lugar conforme a semana, desde que a entrega saia.', weights: { flexibilidade: 4, autonomia: 2 } },
      { text: 'Ter margem para decidir o caminho, desde que o resultado combinado aconteça.', weights: { autonomia: 4, flexibilidade: 1 } },
    ],
  },
  {
    stem: 'Você recebeu uma atividade nova. O que mais ajuda a entrar nela com disposição?',
    category: 'inicio',
    options: [
      { text: 'Entender o resultado esperado e escolher como chegar lá.', weights: { autonomia: 4, desafio: 1 } },
      { text: 'Ter alguém do time para alinhar no começo e não ficar isolado.', weights: { relacionamentos: 4, seguranca: 1 } },
      { text: 'Ver que a atividade serve para alguém de verdade, não só para um relatório.', weights: { proposito: 4, relacionamentos: 1 } },
      { text: 'Haver espaço para testar um jeito que ainda não foi usado aqui.', weights: { criatividade: 4, autonomia: 2 } },
    ],
  },
  {
    stem: 'Qual dessas situações tende a deixar uma semana de trabalho menos satisfatória?',
    category: 'frustracao',
    options: [
      { text: 'Cada passo vir prescrito, com pouco espaço para julgar o caminho.', weights: { autonomia: 4, flexibilidade: 1 } },
      { text: 'Entregar bem e ninguém registrar que aquilo fez diferença.', weights: { reconhecimento: 4, proposito: 1 } },
      { text: 'A remuneração ficar claramente atrás do que o mercado pratica para o mesmo esforço.', weights: { financeiro: 4, seguranca: 2 } },
      { text: 'A agenda invadir noites e fins de semana sem necessidade real.', weights: { equilibrio: 4, flexibilidade: 2 } },
    ],
  },
  {
    stem: 'Duas oportunidades internas, mesmo salário. O que mais pesaria na sua escolha?',
    category: 'escolha',
    options: [
      { text: 'Uma pede algo que pouca gente no time consegue fazer.', weights: { desafio: 4, reconhecimento: 1 } },
      { text: 'Uma deixa mais claro o próximo passo de cargo daqui a um ou dois anos.', weights: { crescimento: 4, seguranca: 1 } },
      { text: 'Uma aproxima você de pessoas com quem já trabalha bem.', weights: { relacionamentos: 4, proposito: 1 } },
      { text: 'Uma permite montar a semana com mais folga entre trabalho e o resto da vida.', weights: { equilibrio: 4, flexibilidade: 2 } },
    ],
  },
  {
    stem: 'Num dia em que tudo emperrou, o que mais ajudaria a retomar o ritmo?',
    category: 'recuperacao',
    options: [
      { text: 'Alguém apontar, com precisão, o que você fez bem mesmo no meio do imprevisto.', weights: { reconhecimento: 4, relacionamentos: 2 } },
      { text: 'Conversar com colegas de confiança e destrinchar junto.', weights: { relacionamentos: 4, seguranca: 1 } },
      { text: 'Lembrar para quem ou para que aquela entrega existe.', weights: { proposito: 4, relacionamentos: 1 } },
      { text: 'Pegar um pedaço difícil e resolver, mesmo pequeno.', weights: { desafio: 4, desenvolvimento: 1 } },
    ],
  },
  {
    stem: 'Imagine que a empresa vai investir em você neste semestre. O que faria mais diferença na prática?',
    category: 'investimento',
    options: [
      { text: 'Tempo e recurso para aprender algo que você ainda não domina, no trabalho real.', weights: { desenvolvimento: 4, crescimento: 2 } },
      { text: 'Um acordo claro de quanto entra na conta e o que vem junto de benefícios.', weights: { financeiro: 4, seguranca: 2 } },
      { text: 'Combinar local e horário de um jeito que a semana feche melhor.', weights: { flexibilidade: 4, equilibrio: 2 } },
      { text: 'Um caminho visível para assumir mais alcance no que já faz.', weights: { crescimento: 4, lideranca: 1 } },
    ],
  },
  {
    stem: 'Ao comparar duas ofertas equivalentes, o que desempata com mais força?',
    category: 'oferta',
    options: [
      { text: 'O conjunto do que entra todo mês e o que cobre imprevisto.', weights: { financeiro: 4, seguranca: 1 } },
      { text: 'Dá para ver, no dia a dia, para que o trabalho serve.', weights: { proposito: 4, relacionamentos: 1 } },
      { text: 'Há problemas densos, não só repetição do que já se sabe fazer.', weights: { desafio: 4, desenvolvimento: 2 } },
      { text: 'A rotina deixa espaço para vida fora do expediente sem culpa.', weights: { equilibrio: 4, flexibilidade: 2 } },
    ],
  },
  {
    stem: 'Em um grupo, qual papel você tende a pegar sem que peçam?',
    category: 'equipe',
    options: [
      { text: 'Puxar a decisão quando o assunto está parado.', weights: { lideranca: 4, desafio: 1 } },
      { text: 'Ficar com o nó técnico ou de processo que ninguém quer.', weights: { desafio: 4, desenvolvimento: 2 } },
      { text: 'Manter o fio entre as pessoas para o trabalho não travar na conversa.', weights: { relacionamentos: 4, proposito: 1 } },
      { text: 'Sugerir um recorte diferente do que já estava no plano.', weights: { criatividade: 4, autonomia: 2 } },
    ],
  },
  {
    stem: 'Quando o gestor comenta seu desempenho, o que mais muda o dia seguinte?',
    category: 'retorno',
    options: [
      { text: 'Ficar claro o que de fato foi notado na entrega.', weights: { reconhecimento: 4, relacionamentos: 1 } },
      { text: 'Sair com um jeito concreto de fazer melhor da próxima vez.', weights: { desenvolvimento: 4, crescimento: 2 } },
      { text: 'Conversar o que isso abre (ou não) daqui a alguns meses.', weights: { crescimento: 4, lideranca: 1 } },
      { text: 'Combinar o resultado e deixar o caminho com você.', weights: { autonomia: 4, desenvolvimento: 1 } },
    ],
  },
  {
    stem: 'Se a área passar por uma reorganização, o que mais pesaria no seu ânimo?',
    category: 'mudanca',
    options: [
      { text: 'Não saber se o contrato e a rotina continuam previsíveis.', weights: { seguranca: 4, financeiro: 2 } },
      { text: 'Passar a ter menos margem para decidir o próprio trabalho.', weights: { autonomia: 4, flexibilidade: 1 } },
      { text: 'O trabalho deixar de fazer sentido para você.', weights: { proposito: 4, relacionamentos: 1 } },
      { text: 'Sumirem as chances de ampliar o que você já construiu.', weights: { crescimento: 4, desenvolvimento: 2 } },
    ],
  },
  {
    stem: 'Qual dessas cenas descreve melhor um ambiente em que você rende?',
    category: 'ambiente',
    options: [
      { text: 'Combinados claros, pouca surpresa de processo.', weights: { seguranca: 4, flexibilidade: 1 } },
      { text: 'Pessoas acessíveis, fácil pedir e oferecer ajuda.', weights: { relacionamentos: 4, proposito: 1 } },
      { text: 'Metas apertadas, com pressão que ainda dá para respirar.', weights: { desafio: 4, crescimento: 2 } },
      { text: 'Dá para prototipar sem pedir autorização a cada detalhe.', weights: { criatividade: 4, autonomia: 2 } },
    ],
  },
  {
    stem: 'Você pode escolher como evoluir numa competência. O que encaixa melhor?',
    category: 'aprender',
    options: [
      { text: 'Um curso ou certificação com tempo protegido na agenda.', weights: { desenvolvimento: 4, financeiro: 1 } },
      { text: 'Pegar um pedaço real do trabalho que ainda não fez.', weights: { desafio: 3, desenvolvimento: 4 } },
      { text: 'Acompanhar alguém mais experiente por algumas semanas.', weights: { desenvolvimento: 4, relacionamentos: 2 } },
      { text: 'Estudar no seu ritmo, sem aula marcada.', weights: { autonomia: 4, desenvolvimento: 2 } },
    ],
  },
  {
    stem: 'No fim de um trimestre, o que mais influencia a sensação de que valeu o esforço?',
    category: 'balanco',
    options: [
      { text: 'O que entrou na conta e o que ficou mais previsível no orçamento pessoal.', weights: { financeiro: 4, seguranca: 2 } },
      { text: 'Ter puxado uma frente que outras pessoas passaram a seguir.', weights: { lideranca: 4, reconhecimento: 2 } },
      { text: 'Alguém de fora do time ter notado o efeito do que você fez.', weights: { proposito: 4, reconhecimento: 2 } },
      { text: 'Sair sabendo fazer algo que no início do trimestre não sabia.', weights: { desenvolvimento: 4, crescimento: 3 } },
    ],
  },
  {
    stem: 'Uma entrega importante foi bem. Qual gesto da empresa teria mais peso para você?',
    category: 'gesto',
    options: [
      { text: 'Um extra financeiro ligado àquele resultado.', weights: { financeiro: 4, reconhecimento: 2 } },
      { text: 'Entrar num tema que o time ainda não resolveu.', weights: { desafio: 3, crescimento: 4 } },
      { text: 'Tempo com alguém sênior para destrinchar o que vem depois.', weights: { desenvolvimento: 4, lideranca: 2 } },
      { text: 'Alguém nomear a entrega na frente de quem importa para o trabalho.', weights: { reconhecimento: 4, relacionamentos: 1 } },
    ],
  },
  {
    stem: 'O que mais te faria aceitar uma frente interna nova, mesmo cansado?',
    category: 'aceite',
    options: [
      { text: 'O problema é de verdade difícil — não é só volume.', weights: { desafio: 4, criatividade: 2 } },
      { text: 'Dá para coordenar pessoas e o rumo, não só executar.', weights: { lideranca: 4, crescimento: 2 } },
      { text: 'Dá para ver o efeito em cliente, operação ou comunidade.', weights: { proposito: 4, reconhecimento: 1 } },
      { text: 'Você decide o método, não só cumpre o roteiro.', weights: { autonomia: 4, desafio: 2 } },
    ],
  },
  {
    stem: 'Na hora de ficar ou sair, o que costuma pesar mais na sua conta interna?',
    category: 'permanencia',
    options: [
      { text: 'Dá para planejar os próximos dois anos sem susto de contrato.', weights: { seguranca: 4, financeiro: 2 } },
      { text: 'O clima e as relações do dia a dia aguentam a pressão.', weights: { relacionamentos: 4, proposito: 1 } },
      { text: 'Ainda há para onde ampliar o que você já construiu.', weights: { crescimento: 4, desenvolvimento: 2 } },
      { text: 'Você organiza o próprio trabalho sem vigia a cada passo.', weights: { autonomia: 4, flexibilidade: 3 } },
    ],
  },
  {
    stem: 'Qual combinação de semana tende a te deixar mais inteiro na sexta?',
    category: 'semana',
    options: [
      { text: 'Horários que se repetem e dá para marcar o resto da vida em volta.', weights: { equilibrio: 4, seguranca: 2 } },
      { text: 'Alguns dias em casa, outros no escritório, conforme a pauta.', weights: { flexibilidade: 4, autonomia: 2 } },
      { text: 'O trabalho puxa, mas você sabe por que aquilo existe.', weights: { proposito: 4, crescimento: 1 } },
      { text: 'O esforço aparece de forma justa no que você recebe.', weights: { financeiro: 4, seguranca: 2 } },
    ],
  },
  {
    stem: 'Uma meta nova chegou. Qual formato te puxa para frente?',
    category: 'meta',
    options: [
      { text: 'Número claro ligado a resultado que dá para converter em remuneração variável.', weights: { financeiro: 3, desafio: 4 } },
      { text: 'Construir relação estável com quem usa o que você entrega.', weights: { relacionamentos: 4, proposito: 1 } },
      { text: 'Dominar um campo que ainda é buraco no seu repertório.', weights: { desenvolvimento: 4, crescimento: 2 } },
      { text: 'Inventar uma solução que ainda não está no manual.', weights: { criatividade: 4, desafio: 1 } },
    ],
  },
  {
    stem: 'O que mais te atrai numa função interna diferente da atual?',
    category: 'mobilidade',
    options: [
      { text: 'Vai exigir um conjunto de habilidades que você ainda está formando.', weights: { desenvolvimento: 4, desafio: 2 } },
      { text: 'Fica mais perto de quem decide o rumo da área.', weights: { reconhecimento: 4, crescimento: 2 } },
      { text: 'O time do destino é gente com quem você já rende.', weights: { relacionamentos: 4, proposito: 1 } },
      { text: 'Há folga para propor o formato, não só herdar o anterior.', weights: { criatividade: 4, autonomia: 2 } },
    ],
  },
  {
    stem: 'Quando olha para trás na carreira, o que mais usa para dizer “isso avançou”?',
    category: 'sucesso',
    options: [
      { text: 'A vida material ficou mais estável do que no capítulo anterior.', weights: { financeiro: 4, seguranca: 2 } },
      { text: 'Você passou a influenciar o que outras pessoas fazem no trabalho.', weights: { lideranca: 4, reconhecimento: 2 } },
      { text: 'Dá para apontar pessoas ou processos que ficaram melhores por causa do seu trabalho.', weights: { proposito: 4, relacionamentos: 3 } },
      { text: 'O repertório de hoje não existia no início.', weights: { desenvolvimento: 4, crescimento: 3 } },
    ],
  },
  {
    stem: 'Se o time pudesse mudar uma coisa na forma de trabalhar com você, o que ajudaria mais?',
    category: 'gestao',
    options: [
      { text: 'Nomear entregas boas no momento em que acontecem, não só no fim do ano.', weights: { reconhecimento: 4, relacionamentos: 1 } },
      { text: 'Combinar o “o quê” e soltar o “como”.', weights: { autonomia: 4, lideranca: 1 } },
      { text: 'Abrir espaço real para você ampliar o que já faz bem.', weights: { desenvolvimento: 4, crescimento: 3 } },
      { text: 'Respeitar o fim do expediente quando a urgência é fabricada.', weights: { equilibrio: 4, relacionamentos: 1 } },
    ],
  },
  {
    stem: 'Qual dessas restrições desgastaria mais se virasse regra o ano inteiro?',
    category: 'restricao',
    options: [
      { text: 'Tudo precisa de visto antes de qualquer ajuste de método.', weights: { autonomia: 4, criatividade: 1 } },
      { text: 'Ninguém comenta o que funcionou — só o que faltou.', weights: { reconhecimento: 4, relacionamentos: 1 } },
      { text: 'A mesma tarefa, o mesmo jeito, mês após mês.', weights: { desafio: 4, criatividade: 2 } },
      { text: 'Reunião e mensagem fora do combinado, como se fosse normal.', weights: { equilibrio: 4, flexibilidade: 1 } },
    ],
  },
  {
    stem: 'Você vai puxar uma frente de três meses. O que mais te faria dizer sim com vontade?',
    category: 'frente',
    options: [
      { text: 'Poder montar a abordagem e corrigir no caminho.', weights: { autonomia: 4, criatividade: 2 } },
      { text: 'O tema importa para quem usa o serviço, não só para o slide interno.', weights: { proposito: 4, relacionamentos: 1 } },
      { text: 'Há um nó que o time ainda não desatou.', weights: { desafio: 4, desenvolvimento: 1 } },
      { text: 'Você coordena outras pessoas, não só a própria lista.', weights: { lideranca: 4, crescimento: 2 } },
    ],
  },
  {
    stem: 'Numa semana típica, o que mais protege sua disposição para continuar?',
    category: 'disposicao',
    options: [
      { text: 'Saber que o combinado de horário e lugar aguenta imprevisto pequeno.', weights: { flexibilidade: 4, equilibrio: 2 } },
      { text: 'Ter com quem falar quando o trabalho emperra.', weights: { relacionamentos: 4, seguranca: 1 } },
      { text: 'Ver que o esforço deste mês cabe no orçamento da vida.', weights: { financeiro: 4, seguranca: 2 } },
      { text: 'Sentir que a semana acrescentou ferramenta nova, não só volume.', weights: { desenvolvimento: 4, desafio: 1 } },
    ],
  },
  {
    stem: 'Qual destas cenas descreve melhor o tipo de confiança que te faz render?',
    category: 'confianca',
    options: [
      { text: 'Combinaram o destino; o itinerário fica com você.', weights: { autonomia: 4, desafio: 1 } },
      { text: 'Dá para prever o mês com pouca inversão de prioridade.', weights: { seguranca: 4, equilibrio: 1 } },
      { text: 'Tem gente ao lado quando a pauta aperta.', weights: { relacionamentos: 4, seguranca: 1 } },
      { text: 'Erro pontual de experimento não vira processo policial.', weights: { criatividade: 4, autonomia: 2 } },
    ],
  },
];

/** @type {Array<{ stem: string, category: string, options: Array<{ text: string, weights: Record<string, number> }> }>} */
const RANKING_QUESTIONS = [
  {
    stem: 'Qual dessas situações mais influencia sua satisfação no trabalho — da que mais pesa para a que menos pesa?',
    category: 'satisfacao',
    options: [
      { text: 'O que entra na conta fecha o mês com folga, sem malabarismo.', weights: { financeiro: 2 } },
      { text: 'Alguém que importa para o trabalho nota, com precisão, o que você fez.', weights: { reconhecimento: 2 } },
      { text: 'Dá para ver o próximo degrau, não só mais do mesmo cargo.', weights: { crescimento: 2 } },
      { text: 'Você escolhe o caminho depois que o resultado ficou claro.', weights: { autonomia: 2 } },
    ],
  },
  {
    stem: 'Se pudesse ajustar só uma coisa no arranjo atual, o que viria primeiro — e o que ficaria por último?',
    category: 'arranjo',
    options: [
      { text: 'O valor e os benefícios acompanharem o esforço de fato.', weights: { financeiro: 2 } },
      { text: 'Poder mudar horário ou lugar quando a semana pede.', weights: { flexibilidade: 2 } },
      { text: 'Ter tempo protegido para aprender no próprio trabalho.', weights: { desenvolvimento: 2 } },
      { text: 'Saber, com antecedência, o que se espera daqui a seis meses.', weights: { seguranca: 2 } },
    ],
  },
  {
    stem: 'O que mais faria você continuar neste time daqui a um ano — da influência maior para a menor?',
    category: 'permanecer',
    options: [
      { text: 'O trabalho ainda faz sentido para alguém além da planilha.', weights: { proposito: 2 } },
      { text: 'As relações do dia a dia aguentam pressão sem virar briga permanente.', weights: { relacionamentos: 2 } },
      { text: 'Ainda aparecem problemas que exigem mais do que o automático.', weights: { desafio: 2 } },
      { text: 'Há espaço para puxar rumo, não só executar lista.', weights: { lideranca: 2 } },
    ],
  },
  {
    stem: 'No dia a dia, o que mais pesa para a semana “fechar bem” — do mais ao menos relevante?',
    category: 'semana',
    options: [
      { text: 'Sobrou energia para o que não é trabalho.', weights: { equilibrio: 2 } },
      { text: 'Deu para testar um jeito que ainda não estava no processo.', weights: { criatividade: 2 } },
      { text: 'Ficou visível que a sua parte moveu o resultado.', weights: { reconhecimento: 2 } },
      { text: 'A semana deixou um passo a mais na trajetória, não só volume.', weights: { crescimento: 2 } },
    ],
  },
  {
    stem: 'Ao começar um projeto, o que mais te puxa para dentro — e o que menos?',
    category: 'projeto',
    options: [
      { text: 'Dá para inventar o recorte, não só copiar o último.', weights: { criatividade: 2 } },
      { text: 'Você articula pessoas e prazos, não só a sua fatia.', weights: { lideranca: 2 } },
      { text: 'Vai sair sabendo fazer o que hoje ainda emperra.', weights: { desenvolvimento: 2 } },
      { text: 'O efeito em quem usa o trabalho é fácil de apontar.', weights: { proposito: 2 } },
    ],
  },
  {
    stem: 'Se a empresa pudesse mudar um benefício prático, o que faria mais diferença — e o que faria menos?',
    category: 'beneficio',
    options: [
      { text: 'Agenda que de fato respeita o fim do expediente.', weights: { equilibrio: 2 } },
      { text: 'Um caminho de cargo com critérios que dá para acompanhar.', weights: { crescimento: 2 } },
      { text: 'O valor mensal subir de forma alinhada ao mercado.', weights: { financeiro: 2 } },
      { text: 'Um clima em que pedir ajuda não pesa.', weights: { relacionamentos: 2 } },
    ],
  },
  {
    stem: 'Qual dessas condições mais protege seu engajamento numa fase puxada — da mais à menos importante?',
    category: 'fase_puxada',
    options: [
      { text: 'Saber que a sobrecarga tem data para acabar.', weights: { seguranca: 2, equilibrio: 1 } },
      { text: 'Poder encaixar médico, escola ou descanso no meio da semana.', weights: { flexibilidade: 2 } },
      { text: 'Alguém nomear o esforço enquanto ele acontece.', weights: { reconhecimento: 2 } },
      { text: 'O esforço difícil ensinar algo que fica com você depois.', weights: { desenvolvimento: 2 } },
    ],
  },
  {
    stem: 'Duas frentes pedem você ao mesmo tempo. O que mais decide a prioridade — e o que menos?',
    category: 'prioridade',
    options: [
      { text: 'Uma deixa você coordenar o rumo das outras pessoas.', weights: { lideranca: 2 } },
      { text: 'Uma é o problema que o time ainda não sabe resolver.', weights: { desafio: 2 } },
      { text: 'Uma muda algo concreto para quem está do outro lado.', weights: { proposito: 2 } },
      { text: 'Uma você faz do seu jeito, com pouco roteiro imposto.', weights: { autonomia: 2 } },
    ],
  },
];

/** @type {Array<{ text: string, category: string, weights: Record<string, number> }>} */
const LIKERT_STATEMENTS = [
  { text: 'Quando alguém descreve com precisão o que eu entreguei, minha disposição para o próximo ciclo sobe.', category: 'entrega_notada', weights: { reconhecimento: 3, relacionamentos: 1 } },
  { text: 'Sair de uma reunião sem ninguém ter notado a minha parte pesa mais do que o cansaço da própria tarefa.', category: 'entrega_notada', weights: { reconhecimento: 4 } },
  { text: 'Um comentário pontual no momento da entrega muda mais o meu dia do que um ritual genérico no fim do ano.', category: 'entrega_notada', weights: { reconhecimento: 3, relacionamentos: 1 } },

  { text: 'Quando o valor que entra não acompanha o esforço, a semana inteira fica mais pesada — mesmo com o resto em ordem.', category: 'conta_do_mes', weights: { financeiro: 4, seguranca: 1 } },
  { text: 'Comparo, de tempos em tempos, o que recebo com o que gente na mesma função recebe fora daqui.', category: 'conta_do_mes', weights: { financeiro: 4 } },
  { text: 'Um extra ligado a resultado concreto me puxa mais do que um elogio solto, sem consequência prática.', category: 'conta_do_mes', weights: { financeiro: 4, reconhecimento: 1 } },

  { text: 'Fico inquieto quando o próximo passo de cargo some do radar por muitos meses.', category: 'trajeto', weights: { crescimento: 4, lideranca: 1 } },
  { text: 'Uma semana mais cheia ainda vale a pena se, no fim, eu saio com um alcance que ainda não tinha.', category: 'trajeto', weights: { crescimento: 4, desafio: 1 } },
  { text: 'Preciso ver, com alguma clareza, o que esta função pode virar daqui a um ou dois anos.', category: 'trajeto', weights: { crescimento: 3, seguranca: 2 } },

  { text: 'Semanas em que só repito o que já sei fazer me deixam mais opaco do que semanas puxadas com aprendizado.', category: 'aprender', weights: { desenvolvimento: 4, desafio: 1 } },
  { text: 'Quando aparece um jeito concreto de aprender no próprio trabalho, meu engajamento sobe.', category: 'aprender', weights: { desenvolvimento: 4, crescimento: 1 } },
  { text: 'Fico frustrado se passo um trimestre sem sair sabendo fazer algo que no início eu não sabia.', category: 'aprender', weights: { desenvolvimento: 4, crescimento: 1 } },

  { text: 'Rendo mais quando combinamos o resultado e o caminho fica comigo.', category: 'caminho', weights: { autonomia: 4 } },
  { text: 'Ter cada passo já desenhado por outra pessoa tira o gosto da tarefa, mesmo quando o tema é interessante.', category: 'caminho', weights: { autonomia: 4, flexibilidade: 1 } },
  { text: 'Cobrança de método a cada hora reduz minha disposição mais do que uma meta apertada com folga de execução.', category: 'caminho', weights: { autonomia: 4 } },

  { text: 'Poder deslocar um bloco da agenda — horário ou lugar — quando a vida pede me deixa mais inteiro no trabalho.', category: 'encaixe', weights: { flexibilidade: 4, equilibrio: 1 } },
  { text: 'Uma regra rígida de onde e quando trabalhar, sem espaço para ajuste, pesa mais do que um pico pontual de demanda.', category: 'encaixe', weights: { flexibilidade: 4, autonomia: 2 } },
  { text: 'Encaixar um compromisso pessoal no meio da semana sem pedir desculpas demais melhora o restante dos dias.', category: 'encaixe', weights: { flexibilidade: 4, equilibrio: 2 } },

  { text: 'Quando não dá para apontar para quem aquilo serve, o esforço vira só cumprimento de lista.', category: 'para_quem', weights: { proposito: 4, relacionamentos: 1 } },
  { text: 'Ver o efeito do trabalho em alguém concreto me puxa mais do que um indicador interno sem rosto.', category: 'para_quem', weights: { proposito: 4 } },
  { text: 'Se a atividade parece existir só para o relatório, minha dedicação cai mesmo com prazo apertado.', category: 'para_quem', weights: { proposito: 4 } },

  { text: 'Ter com quem destrinchar quando emperra pesa tanto quanto a própria dificuldade técnica.', category: 'gente', weights: { relacionamentos: 4, seguranca: 1 } },
  { text: 'Um clima em que pedir ajuda constrange me cansa mais rápido do que uma pauta densa com gente acessível.', category: 'gente', weights: { relacionamentos: 4 } },
  { text: 'Rendo melhor quando o time conversa de verdade, não só troca tarefa no recado.', category: 'gente', weights: { relacionamentos: 4, proposito: 1 } },

  { text: 'Mudanças de rumo sem aviso prévio tiram mais o chão do que um trimestre puxado com combinado claro.', category: 'previsao', weights: { seguranca: 4, financeiro: 1 } },
  { text: 'Saber o que esperar da rotina nas próximas semanas me deixa mais disponível para o difícil.', category: 'previsao', weights: { seguranca: 4 } },
  { text: 'Prefiro um mês previsível a um mês brilhante se o brilho vier com inversão constante de prioridade.', category: 'previsao', weights: { seguranca: 4, flexibilidade: -1 } },

  { text: 'Quando o assunto trava, tende a me caber puxar a decisão — e isso me energiza mais do que só opinar.', category: 'puxar_rumo', weights: { lideranca: 4, desafio: 1 } },
  { text: 'Quando o time está parado, puxar até virar decisão me deixa mais disposto do que só aumentar a minha lista.', category: 'puxar_rumo', weights: { lideranca: 4, crescimento: 2 } },
  { text: 'Ajudar alguém do time a destravar o próprio trabalho me dá uma satisfação específica, diferente de fechar a minha parte.', category: 'puxar_rumo', weights: { lideranca: 3, relacionamentos: 2 } },

  { text: 'Um problema que ainda não tem receita pronta me tira do automático — e isso costuma valer o esforço extra.', category: 'no_dificil', weights: { desafio: 4, crescimento: 1 } },
  { text: 'Meta apertada com chance real de não bater me acende mais do que meta folgada que sempre se cumpre.', category: 'no_dificil', weights: { desafio: 4, reconhecimento: 1 } },
  { text: 'Semanas só de repetição conhecida me esvaziam mais do que semanas densas com nó novo.', category: 'no_dificil', weights: { desafio: 4, criatividade: 1 } },

  { text: 'Quando dá para testar um recorte que ainda não está no processo, a tarefa ganha outro gosto.', category: 'jeito_novo', weights: { criatividade: 4, autonomia: 1 } },
  { text: 'Seguir o manual à risca, sem espaço para um jeito diferente, reduz minha disposição mesmo com tema interessante.', category: 'jeito_novo', weights: { criatividade: 4, desafio: 1 } },
  { text: 'Chegar a uma solução por um caminho que o time ainda não tinha tentado me deixa mais disposto a continuar.', category: 'jeito_novo', weights: { criatividade: 3, desafio: 2 } },

  { text: 'Uma rotina que deixa encaixar vida fora do trabalho sem negociar toda vez é mais sustentável para mim.', category: 'vida_fora', weights: { equilibrio: 4, flexibilidade: 1 } },
  { text: 'Abro mão de uma chance se ela exigir, de forma permanente, o horário que hoje é da vida pessoal.', category: 'vida_fora', weights: { equilibrio: 4, seguranca: 1 } },
  { text: 'Mensagem e reunião fora do combinado, como hábito, pesam mais do que um pico raro e explicado.', category: 'vida_fora', weights: { equilibrio: 4 } },
];

/** Prefixo estável desta geração — não colide com o banco v2 (fc_01 / rank_01 / lk_001). */
export const MOTIVATORS_QUESTION_BANK_GENERATION = 'v3';

/**
 * @returns {Array<{
 *   key: string,
 *   text: string,
 *   questionType: 'forced_choice' | 'ranking' | 'likert',
 *   category: string,
 *   weight: number,
 *   sortOrder: number,
 *   options?: Array<{ key: string, text: string, sortOrder: number, weights: Record<string, number> }>,
 *   dimensionWeights?: Record<string, number>,
 * }>}
 */
export function generateMotivatorsQuestionBank() {
  const questions = [];
  let sortOrder = 0;
  const gen = MOTIVATORS_QUESTION_BANK_GENERATION;

  FORCED_TEMPLATES.forEach((template, tIdx) => {
    questions.push({
      key: `${gen}_fc_${String(tIdx + 1).padStart(2, '0')}`,
      text: template.stem,
      questionType: 'forced_choice',
      category: template.category,
      weight: 1,
      sortOrder: sortOrder++,
      options: template.options.map((opt, oIdx) => ({
        key: `opt_${oIdx + 1}`,
        text: opt.text,
        sortOrder: oIdx,
        weights: opt.weights,
      })),
    });
  });

  RANKING_QUESTIONS.forEach((template, tIdx) => {
    questions.push({
      key: `${gen}_rank_${String(tIdx + 1).padStart(2, '0')}`,
      text: template.stem,
      questionType: 'ranking',
      category: template.category,
      weight: 1,
      sortOrder: sortOrder++,
      options: template.options.map((opt, oIdx) => ({
        key: `opt_${oIdx + 1}`,
        text: opt.text,
        sortOrder: oIdx,
        weights: opt.weights,
      })),
    });
  });

  LIKERT_STATEMENTS.forEach((stmt, idx) => {
    questions.push({
      key: `${gen}_lk_${String(idx + 1).padStart(3, '0')}`,
      text: stmt.text,
      questionType: 'likert',
      category: stmt.category,
      weight: 1,
      sortOrder: sortOrder++,
      dimensionWeights: stmt.weights,
    });
  });

  return questions;
}

export function getQuestionBankStats() {
  const bank = generateMotivatorsQuestionBank();
  const forced = bank.filter((q) => q.questionType === 'forced_choice').length;
  const ranking = bank.filter((q) => q.questionType === 'ranking').length;
  const likert = bank.filter((q) => q.questionType === 'likert').length;
  return { total: bank.length, forcedChoice: forced, ranking, likert };
}

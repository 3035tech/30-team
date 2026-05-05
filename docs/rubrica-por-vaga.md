# Rubrica por vaga (pesos T1–T9)

Este documento explica como funciona a **rubrica de aderência por vaga** no 30Team e traz um **prompt copiável** para gerar pesos com IA.

---

## O que é

A rubrica por vaga é um conjunto de **pesos para os tipos T1–T9** que representa o “perfil desejado” para uma vaga/programa.

### Contexto do instrumento (importante para IA e para o RH)

O 30Team usa uma **avaliação inspirada no modelo do Eneagrama** aplicada ao **contexto de trabalho** (estilo, motivação, colaboração). O resultado do teste inclui **pontuações por tipo T1 a T9** (nove estilos). **T1–T9 não são diagnósticos clínicos**; são **heurísticas** para triagem e conversa com o candidato.

Quando uma IA (ou alguém de fora do produto) for sugerir pesos, ela precisa saber explicitamente que:

- **T1…T9** = nove perfis do mapa usado pelo app (equivalente à ideia dos nove tipos do Eneagrama no vocabulário do produto).
- A rubrica diz **quais desses estilos a vaga deve valorizar mais**, dado o papel e o contexto.

- O **candidato responde o mesmo teste** (mesmas perguntas) para qualquer vaga.
- A rubrica **não muda o teste**; ela muda **como interpretamos o resultado** *para aquela vaga*.
- O sistema calcula uma **aderência 0–10** e permite **ranking/comparativo** dentro da vaga.

### Onde aparece

- **Dashboard → Vagas → Rubrica de aderência (por tipo T1–T9)**: editor de pesos e notas.
- **Dashboard → Vagas → Ranking / comparativo desta vaga**: lista ordenada pela aderência.
- **Dashboard (equipe)**: quando existir rubrica da vaga, a UI passa a priorizar a aderência da vaga para aquela pessoa.

---

## Como os pesos funcionam

Pense nos pesos como **importância relativa**:

- **0 / vazio**: “irrelevante para esta vaga” (não entra no cálculo).
- **1**: “bom ter”.
- **2**: “importante”.
- **3**: “muito importante”.
- **4+**: “extremamente importante” (use com moderação; tende a “puxar” o ranking).

Regras práticas:

- Não é necessário preencher tudo. **2–4 tipos com peso > 0** já geram um ranking útil.
- Pesos são **relativos**: (3,2,1) costuma ser melhor do que (10,9,8) porque mantém o ajuste legível.
- A rubrica é um **sinal**. Use junto de entrevista, desafio técnico, referências e contexto.

---

## “Notas internas” (opcional)

Campo livre para registrar o porquê da rubrica, por exemplo:

- objetivo do perfil desejado (ex.: “potencial de aprendizado + consistência”)
- quais competências/valores está tentando priorizar
- quando revisar (ex.: “revisar após 1 turma / 30 aprovados”)

---

## Prompt copiável para gerar pesos com IA

Cole este prompt em uma IA e substitua o bloco “CONTEXTO DA VAGA”.

```text
Você é um(a) especialista em recrutamento e desenho de rubricas comportamentais.

Contexto do produto (obrigatório ler antes de sugerir pesos):
- A empresa usa o 30Team: uma avaliação de perfil de trabalho baseada no modelo do Eneagrama (nove tipos), representada no sistema como T1..T9.
- O candidato responde um questionário; o sistema gera scores por tipo (T1..T9). Isso é uma heurística para recrutamento/times — não é avaliação clínica nem diagnóstico.
- Sua tarefa é sugerir PESOS (importância relativa) para T1..T9 que melhor traduzem o “perfil desejado” para a vaga descrita abaixo.

Tarefa: gerar uma rubrica de aderência (pesos) para um teste que retorna scores dos tipos T1–T9.
Você deve devolver pesos numéricos para T1..T9 (0 a 3; 0 = irrelevante) e um texto curto explicando o racional.

Referência rápida dos tipos (vocabulário comum do Eneagrama; use como orientação, não como rótulo do candidato):
- T1: reformador / padrões, qualidade, melhoria contínua
- T2: auxiliar / apoio, relacionamento, serviço
- T3: realizador / performance, resultado, imagem de competência
- T4: individualista / profundidade, autenticidade, sentido
- T5: investigador / análise, autonomia, aprofundamento
- T6: leal / prevenção de risco, lealdade, estrutura
- T7: entusiasta / variedade, otimismo, velocidade de ideias
- T8: desafiador / assertividade, confronto, proteção
- T9: pacificador / estabilidade, mediação, ritmo

Regras:
- Não invente informações fora do contexto.
- Prefira rubrica simples: 2–4 tipos com peso > 0.
- Use pesos relativos (3,2,1) e evite números altos.
- Se o contexto tiver ambiguidades (ex.: “hunter vs farmer”), devolva 2 versões de rubrica (A e B) e explique quando usar cada uma.

Formato de resposta (obrigatório):
1) JSON com pesos:
{
  "1": 0,
  "2": 0,
  "3": 0,
  "4": 0,
  "5": 0,
  "6": 0,
  "7": 0,
  "8": 0,
  "9": 0
}
2) Racional (3–6 bullets).
3) Notas internas sugeridas (2–5 linhas) para colar no campo do sistema.

CONTEXTO DA VAGA
- Nome/título:
- Objetivo do papel/programa (o que é sucesso em 60–90 dias):
- Senioridade (júnior/pleno/sênior) e nível de autonomia esperado:
- Ritmo e pressão (baixo/médio/alto) e como é medido:
- Trabalho mais individual vs colaborativo:
- O que mais derruba pessoas nessa função/programa:
- Restrições culturais/valores (ex.: “feedback direto”, “alta disciplina”, “ambiente caótico”):
```

### Como usar o resultado

- Copie o JSON e preencha os campos **T1…T9** na tela da vaga.
- Cole as “Notas internas sugeridas” no campo **Notas internas**.
- Depois de alguns ciclos, revise usando dados reais (ex.: candidatos em `approved` vs `rejected`).


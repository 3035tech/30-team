import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RH_DEFAULT_COMPETENCIES } from '../../lib/people/default-competencies.js';

describe('RH default competencies', () => {
  it('preserves all 17 canonical names in document order', () => {
    const names = RH_DEFAULT_COMPETENCIES.map(competency => competency.name);
    assert.equal(RH_DEFAULT_COMPETENCIES.length, 17);
    assert.equal(new Set(names).size, 17);
    assert.deepEqual(names, [
      'Postura ética', 'Sigilo', 'Comprometimento', 'Comunicação', 'Cooperação',
      'Relacionamento interpessoal', 'Organização', 'Adaptabilidade', 'Proatividade',
      'Autodesenvolvimento', 'Visão sistêmica', 'Cumprimento de metas e objetivos',
      'Eficiência operacional', 'Inovação e resolução de problemas',
      'Conhecimento técnico', 'Comunicação técnica', 'Aprendizado técnico contínuo',
    ]);
  });

  it('freezes the catalog and entries with nonempty text and no unreviewed selfDescription', () => {
    assert.ok(Object.isFrozen(RH_DEFAULT_COMPETENCIES));
    for (const competency of RH_DEFAULT_COMPETENCIES) {
      assert.ok(Object.isFrozen(competency));
      assert.deepEqual(Object.keys(competency).sort(), ['description', 'name']);
      for (const text of [competency.name, competency.description]) {
        assert.equal(typeof text, 'string');
        assert.ok(text.trim().length > 0);
        assert.equal(text, text.trim());
      }
    }
  });

  it('keeps selected descriptions verbatim from the RH document', () => {
    const descriptions = new Map(RH_DEFAULT_COMPETENCIES.map(({ name, description }) => [name, description]));
    assert.equal(descriptions.get('Postura ética'), 'Demonstra conduta profissional, íntegra e respeitosa no ambiente de trabalho. Age de forma coerente com os valores e princípios da empresa, assumindo responsabilidade por suas atitudes e adequando seu comportamento aos diferentes contextos e interlocutores.');
    assert.equal(descriptions.get('Autodesenvolvimento'), 'Demonstra interesse e responsabilidade pelo próprio desenvolvimento profissional e comportamental. Busca compreender seus pontos fortes e oportunidades de melhoria, mostra abertura a feedbacks e transforma aprendizados e experiências em ações para sua evolução.');
    assert.equal(descriptions.get('Aprendizado técnico contínuo'), 'Mantém-se aberto à evolução dos conhecimentos, ferramentas e práticas relacionados à sua área de atuação. Busca novos aprendizados de acordo com as necessidades profissionais e aplica os conhecimentos adquiridos de forma prática, contribuindo para sua evolução e para a melhoria das entregas.');
  });
});

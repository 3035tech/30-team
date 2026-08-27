/**
 * Organizational Culture — leitura hedged a partir de clima + mix T1–T9 + pulso (B-1007, Epic B-1000).
 * Valores declarados (company.about_html) vs praticados (sinais). Sem novo instrumento.
 */

import { asDb } from './ae/as-db.js';
import { climateMeanLevel } from './people/climate-surveys.js';
import { getCompanyTypeMixPercentages } from './overview-type-mix.js';

/**
 * Get organizational culture insights for a company.
 * Synthesizes climate, T1-T9 mix, and team pulse data into hedged culture reading.
 */
export async function getOrganizationalCulture(dbOrQuery, { companyId }) {
  const db = asDb(dbOrQuery);

  const [company, climateData, typeMix, pulseData] = await Promise.all([
    getCompanyValues(db, companyId),
    getClimateCultureSignals(db, companyId),
    getCompanyTypeMixPercentages(db, { companyId }),
    getTeamPulseCultureSignals(db, companyId),
  ]);

  const insights = synthesizeCultureInsights({
    declaredValues: company.aboutHtml,
    climate: climateData,
    typeMix,
    pulse: pulseData,
  });

  return {
    company: {
      name: company.name,
      declaredValues: company.aboutHtml,
    },
    signals: {
      climate: climateData,
      typeMix,
      pulse: pulseData,
    },
    insights,
  };
}

/**
 * Get company declared values (about_html).
 */
async function getCompanyValues(db, companyId) {
  const res = await db.query(
    `SELECT name, about_html AS "aboutHtml" FROM companies WHERE id = $1 LIMIT 1`,
    [companyId]
  );
  if (res.rowCount === 0) return { name: '', aboutHtml: null };
  return res.rows[0];
}

/**
 * Get climate survey culture signals (recent surveys, mean level, themes).
 */
async function getClimateCultureSignals(db, companyId) {
  // Get most recent closed survey
  const surveyRes = await db.query(
    `SELECT id, title, closed_at AS "closedAt"
     FROM climate_surveys
     WHERE company_id = $1 AND status = 'closed'
     ORDER BY closed_at DESC NULLS LAST, id DESC
     LIMIT 1`,
    [companyId]
  );

  if (surveyRes.rowCount === 0) {
    return { hasSurvey: false, meanLevel: null, themes: [] };
  }

  const survey = surveyRes.rows[0];
  const meanLevel = await climateMeanLevel(db, { surveyId: survey.id });

  // Get text responses for theme extraction (simplified - just count for now)
  const textRes = await db.query(
    `SELECT COUNT(*)::int AS "count"
     FROM climate_responses cr
     JOIN climate_questions cq ON cq.id = cr.question_id
     WHERE cq.survey_id = $1 AND cq.kind = 'text' AND cr.text_answer IS NOT NULL AND cr.text_answer != ''`,
    [survey.id]
  );
  const textResponseCount = textRes.rows[0]?.count || 0;

  return {
    hasSurvey: true,
    surveyTitle: survey.title,
    closedAt: survey.closedAt,
    meanLevel,
    textResponseCount,
  };
}

/**
 * Get team pulse culture signals (recent pulses, sentiment).
 */
async function getTeamPulseCultureSignals(db, companyId) {
  const res = await db.query(
    `SELECT id, title, status, created_at AS "createdAt"
     FROM team_pulses
     WHERE company_id = $1
     ORDER BY created_at DESC
     LIMIT 5`,
    [companyId]
  );

  if (res.rowCount === 0) {
    return { hasPulse: false, recentCount: 0 };
  }

  return {
    hasPulse: true,
    recentCount: res.rows.length,
    recentPulses: res.rows.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      createdAt: p.createdAt,
    })),
  };
}

/**
 * Synthesize culture insights from signals (hedged language).
 */
function synthesizeCultureInsights({ declaredValues, climate, typeMix, pulse }) {
  const insights = [];

  // Insight 1: Climate → cultural health indicator
  if (climate.hasSurvey && climate.meanLevel !== null) {
    const level = parseFloat(climate.meanLevel);
    if (level >= 4.0) {
      insights.push({
        category: 'climate',
        signal: 'positive',
        strength: 'strong',
        description: 'Sinais de clima organizacional predominantemente positivo',
        details: `Pesquisa recente indica média ${level.toFixed(1)}/5 — colaboradores tendem a reportar boa experiência no dia a dia.`,
        hedging: 'Indicador baseado em auto-relato; não substitui observação direta.',
      });
    } else if (level >= 3.0) {
      insights.push({
        category: 'climate',
        signal: 'neutral',
        strength: 'medium',
        description: 'Clima organizacional em território neutro',
        details: `Média ${level.toFixed(1)}/5 — espaço para melhoria em reconhecimento, clareza e sustentabilidade.`,
        hedging: 'Média pode mascarar variação entre áreas ou grupos.',
      });
    } else {
      insights.push({
        category: 'climate',
        signal: 'concern',
        strength: 'high',
        description: 'Sinais de clima organizacional desafiador',
        details: `Média ${level.toFixed(1)}/5 — atenção a carga, clareza e espaço para feedback.`,
        hedging: 'Priorizar conversas 1:1 e ações de curto prazo.',
      });
    }
  }

  // Insight 2: T1-T9 mix → cultural archetypes
  if (typeMix && typeMix.length > 0) {
    const dominant = typeMix.filter((t) => t.percentage >= 20);
    if (dominant.length > 0) {
      const dominantTypes = dominant.map((t) => t.type).join(', ');
      insights.push({
        category: 'type_mix',
        signal: 'archetype',
        strength: 'medium',
        description: `Perfis dominantes: ${dominantTypes}`,
        details: `${dominant.map((t) => `${t.type}: ${t.percentage}%`).join(', ')} — cultura tende a refletir essas orientações de trabalho.`,
        hedging: 'Arquétipo cultural é indicador, não determinante. Diversidade e contexto importam.',
      });
    }

    // Check for low diversity (>50% in one type)
    const veryDominant = typeMix.find((t) => t.percentage > 50);
    if (veryDominant) {
      insights.push({
        category: 'type_mix',
        signal: 'homogeneity',
        strength: 'medium',
        description: `Alta concentração em ${veryDominant.type}`,
        details: `${veryDominant.percentage}% do time — pode indicar cultura forte ou risco de groupthink.`,
        hedging: 'Avaliar se a homogeneidade é intencional (fit) ou limitante (falta de perspectivas).',
      });
    }
  }

  // Insight 3: Team pulse → engagement & communication frequency
  if (pulse.hasPulse) {
    insights.push({
      category: 'pulse',
      signal: 'engagement',
      strength: 'low',
      description: `${pulse.recentCount} pulso(s) recente(s) registrado(s)`,
      details: 'Pulsos de grupo indicam prática de escuta e acompanhamento contínuo.',
      hedging: 'Frequência de pulsos é proxy de comunicação, não de qualidade das conversas.',
    });
  }

  // Insight 4: Declared vs. practiced (if declared values exist)
  if (declaredValues && declaredValues.length > 50) {
    const declaredShort = declaredValues.replace(/<[^>]+>/g, '').slice(0, 200);
    insights.push({
      category: 'alignment',
      signal: 'declared_values',
      strength: 'low',
      description: 'Valores declarados registrados',
      details: `"${declaredShort}..." — compare com sinais de clima, mix de perfis e pulsos para gap de alinhamento.`,
      hedging: 'Valores declarados são intenção; cultura praticada emerge dos sinais de comportamento e clima.',
    });
  }

  return insights;
}

/**
 * Get culture summary (high-level rollup for dashboard card).
 */
export async function getCultureSummary(dbOrQuery, { companyId }) {
  const culture = await getOrganizationalCulture(dbOrQuery, { companyId });
  const { signals, insights } = culture;

  // Overall health: climate mean level
  let overallHealth = 'unknown';
  if (signals.climate.hasSurvey && signals.climate.meanLevel !== null) {
    const level = parseFloat(signals.climate.meanLevel);
    if (level >= 4.0) overallHealth = 'positive';
    else if (level >= 3.0) overallHealth = 'neutral';
    else overallHealth = 'concern';
  }

  // Dominant archetype
  let dominantArchetype = null;
  if (signals.typeMix && signals.typeMix.length > 0) {
    const top = signals.typeMix[0];
    if (top.percentage >= 15) {
      dominantArchetype = { type: top.type, percentage: top.percentage };
    }
  }

  return {
    overallHealth,
    dominantArchetype,
    hasClimateData: signals.climate.hasSurvey,
    hasPulseData: signals.pulse.hasPulse,
    hasDeclaredValues: !!culture.company.declaredValues,
    insightCount: insights.length,
  };
}

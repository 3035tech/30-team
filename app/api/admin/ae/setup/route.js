import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import { bootstrapMotivators, getMotivatorsStatus } from '../../../../../lib/ae/bootstrap-motivators';
import { getSessionPayload, requireManagerRole } from '../../../../../lib/ae/require-admin';
import { AE_SCORING_ENGINE_VERSION } from '../../../../../lib/ae/ae-id';

/** GET /api/admin/ae/status — diagnóstico do módulo */
export async function GET() {
  try {
    const payload = getSessionPayload();
    if (!requireManagerRole(payload)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const status = await getMotivatorsStatus(query);
    return NextResponse.json({ ...status, scoringEngine: AE_SCORING_ENGINE_VERSION });
  } catch (err) {
    console.error('GET /api/admin/ae/status', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/** POST /api/admin/ae/setup — inicializa definition + perguntas + templates */
export async function POST() {
  try {
    const payload = getSessionPayload();
    if (!requireManagerRole(payload)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const result = await bootstrapMotivators(query);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('POST /api/admin/ae/setup', err);
    if (err?.code === '42P01') {
      return NextResponse.json(
        { error: 'Tabelas ae_* não existem. Aplique migrations 010 e 011 primeiro.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Falha ao inicializar módulo.' }, { status: 500 });
  }
}

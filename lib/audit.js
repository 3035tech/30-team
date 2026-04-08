import { query } from './db';

export async function audit({ actorUserId, action, targetType = null, targetId = null, metadata = {} }) {
  try {
    await query(
      `INSERT INTO audit_log (actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [actorUserId, action, targetType, targetId, JSON.stringify(metadata)]
    );
  } catch (e) {
    // audit is best-effort; do not break primary flows
    console.error('audit_log failed:', e);
  }
}


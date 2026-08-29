'use client';

import { useMemo, useState } from 'react';
import { t } from '../../lib/i18n';
import { cn } from '../../lib/cn';
import { C } from '../../lib/theme';
import { S } from '../dashboard/dashboard-shared';

const LANE_ORDER = ['recruit', 'public', 'hire', 'people'];

const NODE_IDS = [
  'vacancy',
  'apply',
  'funnel',
  'brief',
  'report',
  'hire',
  'd1',
  'checkins',
  'pdi',
  'climate',
  'motivators',
];

const NODE_LAYOUT = {
  vacancy: { lane: 'recruit', col: 0 },
  motivators: { lane: 'people', col: 0 },
  apply: { lane: 'public', col: 1 },
  funnel: { lane: 'recruit', col: 2 },
  brief: { lane: 'recruit', col: 3 },
  report: { lane: 'public', col: 4 },
  hire: { lane: 'hire', col: 4 },
  d1: { lane: 'hire', col: 5 },
  checkins: { lane: 'hire', col: 6 },
  pdi: { lane: 'people', col: 7 },
  climate: { lane: 'people', col: 8 },
};

const EDGES = [
  { from: 'vacancy', to: 'apply', kind: 'spine' },
  { from: 'apply', to: 'funnel', kind: 'spine' },
  { from: 'funnel', to: 'brief', kind: 'spine' },
  { from: 'brief', to: 'hire', kind: 'spine' },
  { from: 'hire', to: 'd1', kind: 'spine' },
  { from: 'd1', to: 'checkins', kind: 'spine' },
  { from: 'checkins', to: 'pdi', kind: 'spine' },
  { from: 'pdi', to: 'climate', kind: 'spine' },
  { from: 'brief', to: 'report', kind: 'branch' },
  { from: 'motivators', to: 'brief', kind: 'feed' },
  { from: 'motivators', to: 'pdi', kind: 'feed' },
];

const LINK_KEYS = ['t', 'v', 'j', 'c', 'r', 'assessment', 'e', 'climate', 'pulse'];

const NODE_W = 108;
const NODE_H = 36;
const COL_GAP = 28;
const LANE_H = 78;
const PAD_X = 72;
const PAD_Y = 8;

function buildBoxes() {
  const boxes = {};
  let maxCol = 0;
  for (const id of NODE_IDS) {
    const layout = NODE_LAYOUT[id];
    const laneIdx = LANE_ORDER.indexOf(layout.lane);
    const x = PAD_X + layout.col * (NODE_W + COL_GAP);
    const y = PAD_Y + laneIdx * LANE_H + 16;
    maxCol = Math.max(maxCol, layout.col);
    boxes[id] = {
      x,
      y,
      cx: x + NODE_W / 2,
      cy: y + NODE_H / 2,
      lane: layout.lane,
      col: layout.col,
    };
  }
  return {
    boxes,
    width: PAD_X + (maxCol + 1) * (NODE_W + COL_GAP) + 8,
    height: PAD_Y + LANE_ORDER.length * LANE_H + 6,
  };
}

function edgePath(from, to, slot) {
  const x1 = from.x + NODE_W;
  const y1 = from.cy;
  const x2 = to.x;
  const y2 = to.cy;

  if (from.lane === to.lane && to.col === from.col + 1) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  if (from.lane === to.lane) {
    const mid = (x1 + x2) / 2 + slot * 5;
    return `M ${x1} ${y1} L ${mid} ${y1} L ${mid} ${y2} L ${x2} ${y2}`;
  }
  const gutter = from.x + NODE_W + COL_GAP / 2 + slot * 9;
  return `M ${x1} ${y1} L ${gutter} ${y1} L ${gutter} ${y2} L ${x2} ${y2}`;
}

function laneBandFill(laneId) {
  if (laneId === 'recruit') return `${C.info}14`;
  if (laneId === 'hire') return `${C.success}14`;
  if (laneId === 'public') return `${C.warning}18`;
  return 'rgba(26,22,37,0.03)';
}

function nodeFill(laneId, dim) {
  if (dim) return 'rgba(26,22,37,0.04)';
  if (laneId === 'recruit') return `${C.info}22`;
  if (laneId === 'hire') return `${C.success}22`;
  if (laneId === 'public') return `${C.warning}22`;
  return C.surface;
}

function detailBandClass(laneId) {
  if (laneId === 'recruit') return 'border-info/25 bg-info/[0.05]';
  if (laneId === 'hire') return 'border-success/25 bg-success/[0.05]';
  if (laneId === 'public') return 'border-warning/30 bg-warning/[0.06]';
  return 'border-ink/12 bg-ink/[0.02]';
}

/**
 * Interactive BPM swimlane map for the Help guide (recrutar → contratar → gestão).
 */
export function HelpSystemMap({ locale }) {
  const [lane, setLane] = useState('all');
  const [selected, setSelected] = useState('vacancy');
  const { boxes, width, height } = useMemo(() => buildBoxes(), []);

  return (
    <div className="mt-3.5 flex flex-col gap-3">
      <p className="m-0 text-xs leading-snug text-ink-faint">
        {t(locale, 'panel.help.systemMapLegend')}
      </p>

      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label={t(locale, 'panel.help.systemMapFilterAria')}
      >
        <button
          type="button"
          onClick={() => setLane('all')}
          className={cn(
            'min-h-touch cursor-pointer rounded-full border px-3 py-1.5 font-mono text-2xs',
            lane === 'all'
              ? 'border-brand-500/35 bg-brand-500/[0.08] text-brand-600'
              : 'border-ink/12 bg-transparent text-ink-muted'
          )}
        >
          {t(locale, 'panel.help.systemMapLaneAll')}
        </button>
        {LANE_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setLane(id);
              const first = NODE_IDS.find((nid) => NODE_LAYOUT[nid].lane === id);
              if (first) setSelected(first);
            }}
            className={cn(
              'min-h-touch cursor-pointer rounded-full border px-3 py-1.5 font-mono text-2xs',
              lane === id
                ? 'border-brand-500/35 bg-brand-500/[0.08] text-brand-600'
                : 'border-ink/12 bg-transparent text-ink-muted'
            )}
          >
            {t(locale, `panel.help.systemMapLane_${id}`)}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-control border border-ink/12 bg-canvas/80 p-2">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={t(locale, 'panel.help.systemMapDiagramAria')}
          className="block max-w-none"
        >
          {LANE_ORDER.map((laneId, idx) => {
            const y = PAD_Y + idx * LANE_H;
            const dim = lane !== 'all' && lane !== laneId;
            return (
              <g key={laneId} opacity={dim ? 0.35 : 1}>
                <rect
                  x={0}
                  y={y}
                  width={width}
                  height={LANE_H - 6}
                  rx={6}
                  fill={laneBandFill(laneId)}
                  stroke={C.border}
                  strokeWidth={1}
                />
                <text
                  x={6}
                  y={y + LANE_H / 2}
                  dominantBaseline="middle"
                  fill={C.muted}
                  fontSize={9}
                  fontFamily="ui-monospace, monospace"
                  fontWeight={600}
                >
                  {t(locale, `panel.help.systemMapLaneShort_${laneId}`)}
                </text>
              </g>
            );
          })}

          {EDGES.map((e, i) => {
            const from = boxes[e.from];
            const to = boxes[e.to];
            if (!from || !to) return null;
            const fromLane = NODE_LAYOUT[e.from].lane;
            const toLane = NODE_LAYOUT[e.to].lane;
            const dim = lane !== 'all' && fromLane !== lane && toLane !== lane;
            const d = edgePath(from, to, i % 4);
            return (
              <path
                key={`${e.from}-${e.to}`}
                d={d}
                fill="none"
                stroke={C.muted}
                strokeWidth={e.kind === 'spine' ? 1.75 : 1.25}
                strokeDasharray={e.kind === 'spine' ? undefined : '5 4'}
                opacity={dim ? 0.2 : e.kind === 'spine' ? 0.85 : 0.55}
              />
            );
          })}

          {NODE_IDS.map((id) => {
            const box = boxes[id];
            const dim = lane !== 'all' && NODE_LAYOUT[id].lane !== lane;
            const selectedNode = selected === id;
            return (
              <g
                key={id}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelected(id)}
                opacity={dim ? 0.35 : 1}
              >
                <rect
                  x={box.x}
                  y={box.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={8}
                  fill={nodeFill(NODE_LAYOUT[id].lane, dim)}
                  stroke={selectedNode ? C.purple : C.border}
                  strokeWidth={selectedNode ? 2 : 1}
                />
                <text
                  x={box.cx}
                  y={box.y + NODE_H / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={C.text}
                  fontSize={10}
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                  fontWeight={selectedNode ? 600 : 500}
                >
                  {t(locale, `panel.help.systemMapNode_${id}`)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className={cn('rounded-control border p-3', detailBandClass(NODE_LAYOUT[selected].lane))}>
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="font-display text-sm text-ink">
            {t(locale, `panel.help.systemMapNode_${selected}`)}
          </span>
          <span className={cn(S.filterChip, 'text-2xs')}>
            {t(locale, `panel.help.systemMapLane_${NODE_LAYOUT[selected].lane}`)}
          </span>
        </div>
        <p className="mb-2 mt-0 text-prose leading-relaxed text-ink-muted">
          {t(locale, `panel.help.systemMapDoes_${selected}`)}
        </p>
        <dl className="m-0 grid gap-2 sm:grid-cols-3">
          <div>
            <dt className="font-mono text-2xs uppercase tracking-wide text-ink-faint">
              {t(locale, 'panel.help.systemMapWhere')}
            </dt>
            <dd className="m-0 text-xs text-ink">
              {t(locale, `panel.help.systemMapWhere_${selected}`)}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-2xs uppercase tracking-wide text-ink-faint">
              {t(locale, 'panel.help.systemMapWho')}
            </dt>
            <dd className="m-0 text-xs text-ink">
              {t(locale, `panel.help.systemMapWho_${selected}`)}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-2xs uppercase tracking-wide text-ink-faint">
              {t(locale, 'panel.help.systemMapNext')}
            </dt>
            <dd className="m-0 text-xs text-ink">
              {t(locale, `panel.help.systemMapNext_${selected}`)}
            </dd>
          </div>
        </dl>
        <p className="mb-0 mt-2.5 text-2xs leading-snug text-ink-faint">
          {t(locale, 'panel.help.systemMapHedge')}
        </p>
      </div>

      <div>
        <span className={cn(S.label, 'mb-1.5')}>{t(locale, 'panel.help.systemMapLinksTitle')}</span>
        <p className="mb-2 mt-0 text-xs leading-snug text-ink-faint">
          {t(locale, 'panel.help.systemMapLinksHint')}
        </p>
        <div className="overflow-x-auto rounded-control border border-ink/12">
          <table className="w-full min-w-[480px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-ink/12 bg-ink/[0.03]">
                <th className="px-2.5 py-2 font-mono text-2xs font-semibold uppercase tracking-wide text-ink-muted">
                  {t(locale, 'panel.help.systemMapColUrl')}
                </th>
                <th className="px-2.5 py-2 font-mono text-2xs font-semibold uppercase tracking-wide text-ink-muted">
                  {t(locale, 'panel.help.systemMapColName')}
                </th>
                <th className="px-2.5 py-2 font-mono text-2xs font-semibold uppercase tracking-wide text-ink-muted">
                  {t(locale, 'panel.help.systemMapColPurpose')}
                </th>
              </tr>
            </thead>
            <tbody>
              {LINK_KEYS.map((k) => (
                <tr key={k} className="border-b border-ink/8 last:border-0">
                  <td className="px-2.5 py-1.5 font-mono text-2xs text-brand-600">
                    {t(locale, `panel.help.systemMapLinkUrl_${k}`)}
                  </td>
                  <td className="px-2.5 py-1.5 text-ink">
                    {t(locale, `panel.help.systemMapLinkName_${k}`)}
                  </td>
                  <td className="px-2.5 py-1.5 text-ink-muted">
                    {t(locale, `panel.help.systemMapLinkPurpose_${k}`)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Shared overlay / card class strings for in-app dialogs (confirm, notice, prompt). */
export const dialogOverlayClass =
  'fixed inset-0 z-[10060] box-border flex items-center justify-center bg-ink/45 p-6';

/** Above prompt/confirm — e.g. logo crop stacked on company form. */
export const dialogOverlayElevatedClass =
  'fixed inset-0 z-[10070] box-border flex items-center justify-center bg-ink/45 p-6';

export const dialogCardClass =
  'w-full max-w-[420px] rounded-card border border-ink/12 bg-white px-[26px] py-6 shadow-dialog';

export const dialogBtnPrimaryClass =
  'cursor-pointer rounded-control border-none bg-brand-500 px-5 py-2.5 font-mono text-[13px] text-white';

/** Primary button without brand fill — pair with `bg-brand-500` | `bg-danger` | `bg-success`. */
export const dialogBtnSolidClass =
  'cursor-pointer rounded-control border-none px-5 py-2.5 font-mono text-[13px] text-white';

export const dialogBtnGhostClass =
  'cursor-pointer rounded-control border border-ink/12 bg-transparent px-5 py-2.5 font-mono text-[13px] text-ink-muted';

export const dialogFieldClass =
  'mt-1.5 box-border w-full rounded-control border border-ink/12 bg-ink/[0.05] px-3 py-2.5 font-mono text-[13px] text-ink';

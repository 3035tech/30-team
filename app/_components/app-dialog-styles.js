import {
  fieldCheckboxClass,
  fieldInputClass,
  fieldSelectBlockClass,
  fieldTextareaClass,
} from './form-control-styles';

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

/** Text / password / number in dialogs. */
export const dialogFieldClass = `mt-1.5 w-full ${fieldInputClass}`;

/** Native select in dialogs (custom chevron). */
export const dialogSelectClass = `mt-1.5 ${fieldSelectBlockClass}`;

/** Textarea in dialogs. */
export const dialogTextareaClass = `mt-1.5 ${fieldTextareaClass}`;

export const dialogCheckboxClass = fieldCheckboxClass;

import type { Account } from '@/content/schema';
import { compileAccount } from '@/content/compile';

/**
 * The prose. Server component; **never hydrated** (§C.1, §E item 2).
 *
 * The blocks arrive as one compiled HTML string per account, so React's flight
 * payload carries twelve strings instead of a tree of several thousand element
 * descriptors — and the first `<summary>` press works in the first painted
 * frame, before a byte of JavaScript has run.
 *
 * Every block of every account is in this markup, held or not. Which of them
 * exist for this reading is decided by `data-needs` / `data-held` and CSS, set
 * before first paint by `boot.ts` and at each entry by the runtime (§C.6).
 */
export function Blocks({ account }: { account: Account }) {
  const compiled = compileAccount(account);
  return (
    <div className="blocks" dangerouslySetInnerHTML={{ __html: compiled.html }} />
  );
}

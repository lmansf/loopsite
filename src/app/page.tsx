import { AppShell } from '@/components/shell/AppShell';
import { ROOMS } from '@/sections/registry';

/**
 * src/app/page.tsx — the one canonical route.
 *
 * Spec: design/05-build-spec.md §C.10, §F.6.
 *
 * The corridor — all twelve room shells, server-rendered, in notch order — is
 * built here so it is present in the RAW response body. Without JS this page is
 * a plain, readable, scrollable twelve-section document whose links all work.
 * With JS it collapses to 100dvh and the stage takes over.
 */

export const dynamic = 'force-static';

export default function Page() {
  return (
    <AppShell>
      {ROOMS.map((room) => {
        const Shell = room.Shell;
        return (
          <div
            key={room.id}
            className="room-shell"
            data-slug={room.id}
            style={{ minHeight: room.reservedHeight }}
          >
            <Shell />
          </div>
        );
      })}
    </AppShell>
  );
}

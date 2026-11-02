import { APP_NAME, SIDEBAR_TAGLINE } from '../../config/constants';
import type { RecentsApi } from '../../hooks/useRecents';
import { IconLogo, IconPlus } from '../common/icons';
import FilterChips from './FilterChips';
import RecentsList from './RecentsList';
import SearchBox from './SearchBox';

type Props = {
  recents: RecentsApi;
  activeId: string | null;
  onOpen: (id: string) => void;
  onNewChat: () => void;
};

export default function Sidebar({ recents, activeId, onOpen, onNewChat }: Props) {
  return (
    <aside className="flex h-full w-[264px] shrink-0 flex-col border-r border-line bg-surface-muted">
      <div className="px-4 pt-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy text-ink-inverse">
            <IconLogo className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold text-ink">{APP_NAME}</div>
            <div className="text-[11px] text-ink-muted">{SIDEBAR_TAGLINE}</div>
          </div>
        </div>

        {/* New Chat */}
        <button
          type="button"
          onClick={onNewChat}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-[13px] font-medium text-ink-inverse shadow-card transition hover:bg-navy-hover"
        >
          <IconPlus className="h-4 w-4" />
          New Chat
        </button>

        {/* Penyaring recents */}
        <div className="mt-3">
          <FilterChips value={recents.filter} onChange={recents.setFilter} />
        </div>

        {/* Pencarian */}
        <div className="mt-2.5">
          <SearchBox value={recents.query} onChange={recents.setQuery} />
        </div>
      </div>

      {/* Recents */}
      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <RecentsList
          groups={recents.terlihat}
          loading={recents.loading}
          activeId={activeId}
          filter={recents.filter}
          query={recents.query}
          onOpen={onOpen}
        />
      </div>
    </aside>
  );
}

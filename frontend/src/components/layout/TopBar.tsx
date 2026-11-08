import { APP_TAGLINE } from '../../config/constants';
import { IconPlus } from '../common/icons';
import HealthDot from '../common/HealthDot';
import type { HealthStatus } from '../../types/app';

type Props = { health: HealthStatus; onNewChat: () => void };

export default function TopBar({ health, onNewChat }: Props) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface px-4">
      <p className="truncate text-[12.5px] text-ink-muted">{APP_TAGLINE}</p>

      <div className="flex items-center gap-2">
        <HealthDot status={health} />
        <button
          type="button"
          onClick={onNewChat}
          className="flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-[12.5px] font-medium text-ink-inverse transition hover:bg-navy-hover"
        >
          <IconPlus className="h-3.5 w-3.5" />
          New Chat
        </button>
      </div>
    </header>
  );
}

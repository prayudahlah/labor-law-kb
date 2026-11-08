import { cx } from '../../lib/cx';
import { formatJam } from '../../lib/time';
import type { ChatMessage } from '../../types/chat';

type Props = { message: ChatMessage };

export default function MessageBubble({ message }: Props) {
  const dariUser = message.role === 'user';

  return (
    <div className={cx('flex', dariUser ? 'justify-end' : 'justify-start')}>
      <div className={cx('flex max-w-[85%] flex-col', dariUser ? 'items-end' : 'items-start')}>
        <div
          className={cx(
            'px-3.5 py-2.5 text-[14px] leading-6',
            dariUser
              ? 'rounded-2xl rounded-br-md bg-navy text-ink-inverse'
              : 'rounded-2xl rounded-bl-md border border-line bg-surface text-ink',
          )}
        >
          {message.text}
        </div>
        <span className="mt-1 px-1 text-[11px] text-ink-muted">{formatJam(message.createdAt)}</span>
      </div>
    </div>
  );
}

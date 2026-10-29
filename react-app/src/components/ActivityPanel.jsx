import { ACTION_BADGE_STYLES, ACTION_BADGE_FALLBACK } from '../constants/styles';
import { formatTime } from '../utils/formatTime';

export default function ActivityPanel({ activities, onClear }) {
  return (
    <aside
      className="flex h-full min-h-0 flex-col bg-white"
      aria-labelledby="activity-heading"
    >
      <div className="shrink-0 border-b border-gray-200 px-4 py-3">
        <h2 id="activity-heading" className="font-semibold text-gray-900 text-sm sm:text-base">
          Recent activity
        </h2>
        <p className="text-xs text-gray-500">Latest file changes</p>
      </div>

      {activities.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-500">Changes will appear here.</p>
      ) : (
        <ol
          className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto"
          aria-live="polite"
          aria-relevant="additions"
        >
          {activities.map((activity) => (
            <li key={activity.id} className="flex items-start gap-3 px-4 py-3">
              <span
                className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${ACTION_BADGE_STYLES[activity.type] ?? ACTION_BADGE_FALLBACK}`}
              >
                {activity.type}
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm text-gray-800">{activity.message}</p>
                <time className="mt-1 block text-xs text-gray-500" dateTime={activity.timestamp}>
                  {formatTime(activity.timestamp)}
                </time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

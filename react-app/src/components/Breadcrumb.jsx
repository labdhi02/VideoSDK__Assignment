export default function Breadcrumb({ path, onNavigate }) {
  if (!path || path.length === 0) return null;

  return (
    <nav
      className="shrink-0 overflow-x-auto border-b border-gray-200 bg-gray-50 px-3 py-2 sm:px-4 sm:py-3"
      aria-label="Breadcrumb"
    >
      <ol className="flex min-w-0 items-center gap-0.5 whitespace-nowrap text-sm">
        {path.map((item, index) => (
          <li key={item.id} className="flex items-center">
            {index > 0 && (
              <span className="mx-1 text-xs text-gray-400" aria-hidden="true">/</span>
            )}
            <button
              className={`max-w-[160px] truncate rounded px-1.5 py-0.5 font-medium transition-all sm:max-w-[240px] ${
                index === path.length - 1
                  ? 'cursor-default font-semibold text-gray-900'
                  : 'text-primary-600 hover:bg-primary-50 hover:text-primary-800'
              }`}
              onClick={() => onNavigate(item.id)}
              disabled={index === path.length - 1}
              title={item.name}
            >
              {item.name}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Shared stroke icons for dashboard chrome (sidebar, toggles, KPIs).
 * viewBox 24×24, rendered 18×18 — matches former NavIcon.
 */
export function Icon({ name, className }) {
  const props = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    className: className || 'shrink-0',
  };
  switch (name) {
    case 'overview':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case 'team':
      return (
        <svg {...props}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="3" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a3 3 0 0 1 0 5.75" />
        </svg>
      );
    case 'compatibility':
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="3" />
          <circle cx="16" cy="16" r="3" />
          <path d="M10.5 10.5 13.5 13.5" />
        </svg>
      );
    case 'compare':
      return (
        <svg {...props}>
          <path d="M8 6h13" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
          <path d="M3 6h.01" />
          <path d="M3 12h.01" />
          <path d="M3 18h.01" />
        </svg>
      );
    case 'group':
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="3" />
          <circle cx="6.5" cy="16" r="2.5" />
          <circle cx="17.5" cy="16" r="2.5" />
        </svg>
      );
    case 'leadership':
      return (
        <svg {...props}>
          <path d="M12 3 14.5 9.5 21 10.5 16 15.2 17.5 21.5 12 18.2 6.5 21.5 8 15.2 3 10.5 9.5 9.5Z" />
        </svg>
      );
    case 'vacancies':
      return (
        <svg {...props}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      );
    case 'motivators':
      return (
        <svg {...props}>
          <path d="M12 3c2.5 3.5 6 5.5 6 10a6 6 0 0 1-12 0c0-4.5 3.5-6.5 6-10Z" />
        </svg>
      );
    case 'companies':
    case 'building':
      return (
        <svg {...props}>
          <path d="M4 21V6a2 2 0 0 1 2-2h7v17" />
          <path d="M13 10h5a2 2 0 0 1 2 2v9" />
          <path d="M8 8h1" />
          <path d="M8 12h1" />
          <path d="M8 16h1" />
          <path d="M16 14h1" />
          <path d="M16 18h1" />
        </svg>
      );
    case 'users':
    case 'user':
      return (
        <svg {...props}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="3" />
        </svg>
      );
    case 'help':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5" />
          <path d="M12 17h.01" />
        </svg>
      );
    case 'logout':
      return (
        <svg {...props}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      );
    case 'collapse':
      return (
        <svg {...props}>
          <path d="M15 18 9 12l6-6" />
        </svg>
      );
    case 'expand':
    case 'chevronRight':
      return (
        <svg {...props}>
          <path d="M9 18l6-6-6-6" />
        </svg>
      );
    case 'search':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      );
    case 'clear':
      return (
        <svg {...props}>
          <path d="M18 6 6 18" />
          <path d="M6 6l12 12" />
        </svg>
      );
    case 'menu':
      return (
        <svg {...props}>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      );
    case 'list':
      return (
        <svg {...props}>
          <path d="M8 6h13" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
          <path d="M3 6h.01" />
          <path d="M3 12h.01" />
          <path d="M3 18h.01" />
        </svg>
      );
    case 'kanban':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="18" rx="1" />
          <rect x="14" y="3" width="7" height="12" rx="1" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...props}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M8 16V10" />
          <path d="M13 16V7" />
          <path d="M18 16v-4" />
        </svg>
      );
    default:
      return null;
  }
}

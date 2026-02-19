import { useLocation, NavLink } from 'react-router-dom';
import { MODULE_REGISTRY } from '../../config/modules';

export default function TopBar({ sidebarOpen, onToggleSidebar }) {
  const location = useLocation();
  const currentModule = MODULE_REGISTRY.find(m =>
    m.path === '/' ? location.pathname === '/' : location.pathname.startsWith(m.path)
  );

  return (
    <header className="h-14 flex items-center px-5 flex-shrink-0 relative z-10">
      {/* Bottom border glow */}
      <div className="absolute bottom-0 left-0 right-0 neon-line opacity-30" />

      <button
        onClick={onToggleSidebar}
        className="mr-4 p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.05] transition-all duration-300 group"
      >
        <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {sidebarOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm min-w-0">
        <NavLink to="/" className="text-gray-600 hover:text-gray-300 transition-colors duration-300 font-medium">
          Overload
        </NavLink>
        {currentModule && (
          <>
            <svg className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="font-semibold text-gray-200 truncate animate-fade-in">{currentModule.name}</span>
          </>
        )}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">
        {currentModule && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-card animate-fade-in">
            <div className="relative">
              <div className="w-2 h-2 rounded-full" style={{ background: currentModule.color }} />
              <div className="absolute inset-0 rounded-full animate-pulse-ring" style={{ background: currentModule.color, opacity: 0.3 }} />
            </div>
            <span className="text-[11px] font-medium" style={{ color: currentModule.color }}>
              {currentModule.name}
            </span>
          </div>
        )}

        {/* Decorative element */}
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-1 rounded-full bg-violet-500/40" />
          <div className="w-1 h-1 rounded-full bg-fuchsia-500/40" />
          <div className="w-1 h-1 rounded-full bg-pink-500/40" />
        </div>
      </div>
    </header>
  );
}

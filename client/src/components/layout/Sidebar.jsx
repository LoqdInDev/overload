import { NavLink, useLocation } from 'react-router-dom';
import { MODULE_REGISTRY, CATEGORIES, getModulesByCategory } from '../../config/modules';

export default function Sidebar({ open, onToggle }) {
  const location = useLocation();

  return (
    <aside className={`${open ? 'w-[272px]' : 'w-0'} transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col overflow-hidden flex-shrink-0 relative z-20`}>
      {/* Background layers */}
      <div className="absolute inset-0 bg-[#08070d]" />
      <div className="absolute inset-0 bg-gradient-to-b from-violet-950/20 via-transparent to-transparent" />
      <div className="absolute inset-y-0 right-0 neon-line-vertical" />

      {/* Subtle orb at top */}
      <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)', filter: 'blur(40px)' }}
      />

      {/* Logo */}
      <div className="relative p-5 pb-4">
        <NavLink to="/" className="flex items-center gap-3 group">
          <div className="relative">
            {/* Animated glow ring */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 opacity-50 blur-lg group-hover:opacity-80 transition-opacity duration-500" />
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg overflow-hidden">
              <svg className="w-5 h-5 text-white relative z-10" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              {/* Inner shine */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gradient-hero tracking-tight">Overload</h1>
            <p className="text-[10px] text-gray-600 tracking-[0.2em] uppercase font-semibold">Marketing OS</p>
          </div>
        </NavLink>
      </div>

      {/* Separator */}
      <div className="relative mx-5 neon-line opacity-50" />

      {/* Navigation */}
      <nav className="relative flex-1 overflow-y-auto py-4 px-3 space-y-6 no-scrollbar">
        {CATEGORIES.map(category => {
          const modules = getModulesByCategory(category.id);
          if (!modules.length) return null;

          return (
            <div key={category.id} className="animate-fade-in">
              <div className="flex items-center gap-2.5 px-3 mb-2.5">
                <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={category.icon} />
                </svg>
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.15em]">{category.label}</span>
              </div>

              <div className="space-y-1">
                {modules.map(mod => {
                  const isActive = mod.path === '/' ? location.pathname === '/' : location.pathname.startsWith(mod.path);

                  return (
                    <NavLink
                      key={mod.id}
                      to={mod.path}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300 relative overflow-hidden ${
                        isActive
                          ? 'text-white'
                          : 'text-gray-500 hover:text-gray-200'
                      }`}
                    >
                      {/* Active background glow */}
                      {isActive && (
                        <>
                          <div className="absolute inset-0 rounded-xl" style={{ background: `linear-gradient(135deg, ${mod.color}15, ${mod.color}08)` }} />
                          <div className="absolute inset-0 rounded-xl border" style={{ borderColor: `${mod.color}25` }} />
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: mod.color, boxShadow: `0 0 12px ${mod.color}60` }} />
                        </>
                      )}

                      {/* Hover background */}
                      {!isActive && (
                        <div className="absolute inset-0 rounded-xl bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      )}

                      <div
                        className={`relative w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                          isActive
                            ? 'shadow-lg'
                            : 'bg-white/[0.04] group-hover:bg-white/[0.08]'
                        }`}
                        style={isActive ? {
                          background: `linear-gradient(135deg, ${mod.color}, ${mod.color}cc)`,
                          boxShadow: `0 4px 15px -3px ${mod.color}50`,
                        } : {}}
                      >
                        <svg className={`w-4 h-4 transition-all duration-300 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={mod.icon} />
                        </svg>
                      </div>
                      <span className="relative font-medium truncate">{mod.name}</span>
                      {isActive && (
                        <div className="relative ml-auto w-1.5 h-1.5 rounded-full" style={{ background: mod.color, boxShadow: `0 0 8px ${mod.color}80` }} />
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="relative p-4 pt-2">
        <div className="mx-2 neon-line opacity-30 mb-4" />
        <div className="glass-card rounded-xl p-3.5 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5" />
          <div className="relative flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <p className="text-[10px] text-gray-500 font-medium tracking-wide">Powered by Claude AI</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

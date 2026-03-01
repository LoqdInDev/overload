import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

export default function NotFoundPage() {
  usePageTitle('Page Not Found');

  return (
    <div
      className="flex flex-col items-center justify-center min-h-full px-6 py-20 text-center"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <h1
        className="font-light tracking-tight"
        style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: 'clamp(72px, 12vw, 120px)',
          color: '#C45D3E',
          lineHeight: 1,
          marginBottom: '0.25em',
        }}
      >
        404
      </h1>
      <p
        className="text-lg font-medium mb-2"
        style={{ color: '#332F2B' }}
      >
        Page not found
      </p>
      <p
        className="text-sm mb-8 max-w-md"
        style={{ color: '#94908A' }}
      >
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
        style={{
          background: '#C45D3E',
          color: '#FFFFFF',
          boxShadow: '0 2px 8px rgba(196,93,62,0.3)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = '#A94E34';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(196,93,62,0.4)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = '#C45D3E';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(196,93,62,0.3)';
        }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Go Home
      </Link>
    </div>
  );
}

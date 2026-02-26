import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/cn';

export default function Skeleton({
  variant = 'text',
  width,
  height,
  lines = 1,
  className,
}) {
  const { dark } = useTheme();
  const bg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.06)';
  const shimmer = dark
    ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)'
    : 'linear-gradient(90deg, transparent 0%, rgba(44,40,37,0.03) 50%, transparent 100%)';

  const base = {
    background: bg,
    backgroundImage: shimmer,
    backgroundSize: '200% 100%',
    animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
  };

  if (variant === 'circular') {
    return (
      <div
        className={cn('rounded-full', className)}
        style={{ ...base, width: width || 40, height: height || 40 }}
      />
    );
  }

  if (variant === 'rectangular') {
    return (
      <div
        className={cn('rounded-xl', className)}
        style={{ ...base, width: width || '100%', height: height || 120 }}
      />
    );
  }

  // Text variant - renders multiple lines
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="rounded-md"
          style={{
            ...base,
            height: height || 14,
            width: i === lines - 1 && lines > 1 ? '70%' : (width || '100%'),
          }}
        />
      ))}
    </div>
  );
}

Skeleton.Card = function SkeletonCard({ className }) {
  return (
    <div className={cn('space-y-3', className)}>
      <Skeleton variant="rectangular" height={20} width="40%" />
      <Skeleton variant="text" lines={3} />
    </div>
  );
};

Skeleton.Table = function SkeletonTable({ rows = 5, cols = 4, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} variant="text" width={`${100 / cols}%`} height={12} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} variant="text" width={`${100 / cols}%`} height={16} />
          ))}
        </div>
      ))}
    </div>
  );
};

Skeleton.Chart = function SkeletonChart({ className }) {
  return (
    <Skeleton variant="rectangular" height={200} className={className} />
  );
};

import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/cn';

export default function Card({
  variant = 'default',
  padding = 'md',
  hover = false,
  className,
  children,
  style: styleProp,
  ...props
}) {
  const { dark } = useTheme();

  const bg = dark ? '#1E1B18' : '#FFFFFF';
  const border = dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.08)';
  const shadow = dark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)';

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-7',
  };

  return (
    <div
      className={cn(
        'rounded-xl transition-all duration-200',
        paddings[padding],
        hover && 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer',
        className
      )}
      style={{
        background: variant === 'outlined' ? 'transparent' : bg,
        border: `1px solid ${border}`,
        boxShadow: variant === 'outlined' ? 'none' : shadow,
        ...styleProp,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

Card.Header = function CardHeader({ children, className, border = true }) {
  const { dark } = useTheme();
  const borderColor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.08)';

  return (
    <div
      className={cn('px-5 py-3', className)}
      style={border ? { borderBottom: `1px solid ${borderColor}` } : undefined}
    >
      {children}
    </div>
  );
};

Card.Body = function CardBody({ children, className }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>;
};

Card.Footer = function CardFooter({ children, className, border = true }) {
  const { dark } = useTheme();
  const borderColor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.08)';

  return (
    <div
      className={cn('px-5 py-3', className)}
      style={border ? { borderTop: `1px solid ${borderColor}` } : undefined}
    >
      {children}
    </div>
  );
};

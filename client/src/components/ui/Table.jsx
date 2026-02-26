import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/cn';

export default function Table({ children, className, ...props }) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse" {...props}>
        {children}
      </table>
    </div>
  );
}

Table.Head = function TableHead({ children, className }) {
  return <thead className={className}>{children}</thead>;
};

Table.Body = function TableBody({ children, className }) {
  return <tbody className={className}>{children}</tbody>;
};

Table.Row = function TableRow({ children, className, hoverable = true, ...props }) {
  const { dark } = useTheme();
  const hoverBg = dark ? 'rgba(255,255,255,0.02)' : 'rgba(196,93,62,0.03)';

  return (
    <tr
      className={cn(
        'transition-colors duration-150',
        hoverable && 'hover:bg-[var(--row-hover)]',
        className
      )}
      style={{ '--row-hover': hoverBg }}
      {...props}
    >
      {children}
    </tr>
  );
};

Table.Th = function TableTh({ children, className, align = 'left', ...props }) {
  const { dark } = useTheme();
  const borderColor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(44,40,37,0.08)';

  return (
    <th
      scope="col"
      className={cn(
        'px-4 py-2.5 text-[10px] font-bold tracking-[0.08em] uppercase whitespace-nowrap',
        `text-${align}`,
        className
      )}
      style={{
        color: '#94908A',
        borderBottom: `1px solid ${borderColor}`,
      }}
      {...props}
    >
      {children}
    </th>
  );
};

Table.Td = function TableTd({ children, className, align = 'left', ...props }) {
  const { dark } = useTheme();
  const borderColor = dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)';
  const textColor = dark ? '#E8E4DE' : '#332F2B';

  return (
    <td
      className={cn(
        'px-4 py-3 text-[13px]',
        `text-${align}`,
        className
      )}
      style={{
        color: textColor,
        borderBottom: `1px solid ${borderColor}`,
      }}
      {...props}
    >
      {children}
    </td>
  );
};

import React from 'react';
import { cn } from '../logic/utils';
import type { LucideIcon } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    icon?: LucideIcon;
  };
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  action,
  className
}) => {
  return (
    <header className={cn(
      "bg-card border-b border-border sticky top-0 z-30 px-6 py-4 flex justify-between items-center shadow-sm",
      className
    )}>
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center">
          {Icon && <Icon className="w-6 h-6 mr-3 text-accent" />}
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-muted mt-1 flex items-center">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm flex items-center group shadow-md",
            action.variant === 'primary' || !action.variant ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md focus:ring-blue-500" :
            action.variant === 'secondary' ? "bg-muted text-muted-foreground hover:bg-muted/80 focus:ring-muted" :
            action.variant === 'outline' ? "border border-border bg-background hover:bg-accent/5 focus:ring-accent" :
            "hover:bg-accent/5 focus:ring-accent"
          )}
        >
          {action.icon && <action.icon className="w-5 h-5 mr-2" />}
          {action.label}
        </button>
      )}
    </header>
  );
};

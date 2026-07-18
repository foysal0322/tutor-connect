import React from 'react';

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-lg border border-color my-4">
      {icon && (
        <div className="mb-4 text-muted" style={{ opacity: 0.5 }}>
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && <p className="text-muted mb-6 max-w-md">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}

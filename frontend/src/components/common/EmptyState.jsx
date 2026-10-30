import React from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button.jsx';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No items found',
  message = 'There are currently no records to display.',
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-surface rounded-xl border border-dashed border-gray-300 ${className}`}
    >
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-appText-secondary mb-3">
        <Icon className="w-7 h-7 stroke-[1.5]" />
      </div>
      <h4 className="text-base font-bold text-appText-primary font-display">{title}</h4>
      <p className="text-xs sm:text-sm text-appText-secondary max-w-sm mt-1 mb-5">
        {message}
      </p>
      {actionText && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;

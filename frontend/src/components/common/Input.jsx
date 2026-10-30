import React, { forwardRef } from 'react';

export const Input = forwardRef(
  (
    {
      label,
      error,
      helperText,
      required = false,
      type = 'text',
      id,
      className = '',
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name || Math.random().toString(36).substring(7);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-appText-secondary uppercase tracking-wider flex items-center gap-1"
          >
            {label}
            {required && <span className="text-emergency font-bold">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`w-full px-3.5 py-2.5 bg-surface border rounded-lg text-sm text-appText-primary placeholder-gray-400 min-h-[44px] transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
            error
              ? 'border-emergency focus:ring-emergency'
              : 'border-gray-300 hover:border-gray-400'
          } ${className}`}
          {...props}
        />
        {error ? (
          <p className="text-xs text-emergency font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-appText-secondary">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

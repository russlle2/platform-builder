import React from 'react';

export interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tooltip?: string;
}

export function Toggle({ label, checked, onChange, tooltip }: ToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            checked ? 'bg-amber-500' : 'bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              checked ? 'translate-x-5' : ''
            }`}
          />
        </button>
        <span className="text-white text-sm">{label}</span>
      </div>
      {tooltip && (
        <span className="text-gray-400 text-xs" title={tooltip}>
          ℹ️
        </span>
      )}
    </div>
  );
}

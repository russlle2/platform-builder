import React from 'react';

export interface WizardPanelProps {
  title: string;
  step: number;
  totalSteps: number;
  children: React.ReactNode;
  onContinue?: () => void;
  onBack?: () => void;
  canContinue?: boolean;
}

export function WizardPanel({
  title,
  step,
  totalSteps,
  children,
  onContinue,
  onBack,
  canContinue = true,
}: WizardPanelProps) {
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-amber-900 via-amber-800 to-yellow-900 rounded-2xl border border-amber-700/30 shadow-2xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-amber-700/30">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <span className="text-amber-300 text-sm font-medium">
            Step {step} of {totalSteps}
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-amber-950 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow overflow-y-auto px-6 py-6">
        {children}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-amber-700/30 flex justify-between">
        <button
          onClick={onBack}
          disabled={step <= 1}
          className="px-6 py-2 text-white border border-white/30 rounded-lg hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className="px-6 py-2 bg-white text-amber-900 font-bold rounded-lg hover:bg-gray-100 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

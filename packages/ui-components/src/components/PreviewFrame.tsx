import React from 'react';

export interface PreviewFrameProps {
  children?: React.ReactNode;
  templateBg?: string;
  className?: string;
}

export function PreviewFrame({ children, templateBg = '/images/template-bg-1.jpg', className = '' }: PreviewFrameProps) {
  return (
    <div
      className={`relative rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50 bg-gray-900 ${className}`}
      style={{ minHeight: '600px' }}
    >
      {/* Template background */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url(${templateBg})` }}
      />

      {/* Browser chrome */}
      <div className="relative z-10">
        <div className="flex items-center space-x-2 px-4 py-2 bg-gray-800/80 border-b border-gray-700/50">
          <div className="flex space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex-grow mx-4">
            <div className="bg-gray-700 rounded-md px-3 py-1 text-gray-400 text-xs">
              yoursite.com
            </div>
          </div>
        </div>

        {/* Preview content */}
        <div className="p-4">
          {children || (
            <div className="space-y-4 text-center pt-12">
              <div className="w-16 h-16 mx-auto bg-amber-600/20 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">Live preview will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

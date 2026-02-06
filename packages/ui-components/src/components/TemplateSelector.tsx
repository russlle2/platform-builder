import React from 'react';

export interface Template {
  id: string;
  name: string;
  thumbnail: string;
  category: 'hvac' | 'plumbing' | 'general';
}

export interface TemplateSelectorProps {
  templates: Template[];
  selectedId?: string;
  onSelect?: (template: Template) => void;
}

const DEFAULT_TEMPLATES: Template[] = [
  { id: 'hvac-pro', name: 'HVAC Professional', thumbnail: '/images/template-bg-1.jpg', category: 'hvac' },
  { id: 'hvac-modern', name: 'Modern HVAC', thumbnail: '/images/template-bg-2.jpg', category: 'hvac' },
  { id: 'plumbing-classic', name: 'Classic Plumbing', thumbnail: '/images/template-bg-3.jpg', category: 'plumbing' },
  { id: 'industrial', name: 'Industrial Pro', thumbnail: '/images/template-bg-4.jpg', category: 'general' },
  { id: 'hvac-elite', name: 'Elite HVAC', thumbnail: '/images/template-bg-5.jpg', category: 'hvac' },
  { id: 'plumbing-modern', name: 'Modern Plumbing', thumbnail: '/images/template-bg-6.jpg', category: 'plumbing' },
];

export function TemplateSelector({
  templates = DEFAULT_TEMPLATES,
  selectedId,
  onSelect,
}: TemplateSelectorProps) {
  const [currentIndex, setCurrentIndex] = React.useState(
    templates.findIndex((t) => t.id === selectedId) || 0
  );

  const goLeft = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : templates.length - 1;
    setCurrentIndex(newIndex);
    onSelect?.(templates[newIndex]);
  };

  const goRight = () => {
    const newIndex = currentIndex < templates.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    onSelect?.(templates[newIndex]);
  };

  const current = templates[currentIndex];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={goLeft}
          className="p-2 text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
          aria-label="Previous template"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex-grow mx-4">
          <div
            className="aspect-video rounded-xl overflow-hidden border-2 border-amber-500/50 bg-gray-800 bg-cover bg-center"
            style={{ backgroundImage: `url(${current?.thumbnail})` }}
          >
            <div className="w-full h-full flex items-end bg-gradient-to-t from-black/60 to-transparent p-4">
              <span className="text-white font-medium">{current?.name}</span>
            </div>
          </div>
        </div>

        <button
          onClick={goRight}
          className="p-2 text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
          aria-label="Next template"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Thumbnails */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {templates.map((template, idx) => (
          <button
            key={template.id}
            onClick={() => {
              setCurrentIndex(idx);
              onSelect?.(template);
            }}
            className={`flex-shrink-0 w-16 h-10 rounded-lg bg-cover bg-center border-2 transition-all ${
              idx === currentIndex ? 'border-amber-500 scale-110' : 'border-gray-600 opacity-60 hover:opacity-100'
            }`}
            style={{ backgroundImage: `url(${template.thumbnail})` }}
            aria-label={template.name}
          />
        ))}
      </div>
    </div>
  );
}

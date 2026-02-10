'use client'

import { useEditorStore } from '@/store/editorStore'
import { Button } from './Button'

const componentTypes = [
  { type: 'heading', label: 'Heading', icon: '📰' },
  { type: 'text', label: 'Text', icon: '📝' },
  { type: 'image', label: 'Image', icon: '🖼️' },
  { type: 'button', label: 'Button', icon: '🔘' },
  { type: 'card', label: 'Card', icon: '🃏' },
  { type: 'grid', label: 'Grid', icon: '▦' },
]

export function ComponentPanel() {
  const addComponent = useEditorStore((state) => state.addComponent)

  const handleAddComponent = (type: string) => {
    const defaultContent: Record<string, string> = {
      heading: 'New Heading',
      text: 'New text content',
      image: 'https://via.placeholder.com/600x400/e2e8f0/475569?text=Image+Placeholder',
      button: 'Click Me',
      card: 'Card content',
      grid: 'Grid layout',
    }

    addComponent({
      type,
      content: defaultContent[type] || 'New component',
    })
  }

  return (
    <div className="space-y-2">
      {componentTypes.map(({ type, label, icon }) => (
        <button
          key={type}
          onClick={() => handleAddComponent(type)}
          className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
        >
          <span className="text-2xl">{icon}</span>
          <span className="font-medium">{label}</span>
        </button>
      ))}
    </div>
  )
}

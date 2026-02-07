'use client'

import { useEditorStore } from '@/store/editorStore'
import { Button } from '@/components/Button'
import { ImageUpload } from '@/components/ImageUpload'
import { ComponentPanel } from '@/components/ComponentPanel'

export default function EditorPage() {
  const { components, addComponent, selectedComponent } = useEditorStore()

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar - Component Library */}
      <aside className="w-64 bg-white shadow-lg p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Components</h2>
        <ComponentPanel />
      </aside>

      {/* Main Canvas */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg p-8 min-h-full">
          <div className="mb-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Website Editor</h1>
            <div className="flex gap-2">
              <Button variant="secondary" size="medium">
                Preview
              </Button>
              <Button variant="primary" size="medium">
                Publish
              </Button>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 min-h-[600px]">
            {components.length === 0 ? (
              <div className="text-center text-gray-500 py-20">
                <p className="text-xl mb-4">Start building your website</p>
                <p>Drag components from the left panel to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {components.map((component) => (
                  <div
                    key={component.id}
                    className={`p-4 border rounded ${
                      selectedComponent === component.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="text-sm text-gray-500 mb-2">{component.type}</div>
                    <div>{component.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Right Sidebar - Properties */}
      <aside className="w-80 bg-white shadow-lg p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Properties</h2>
        {selectedComponent ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Content</label>
              <textarea
                className="w-full p-2 border rounded"
                rows={4}
                placeholder="Edit content..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Image Upload</label>
              <ImageUpload />
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Select a component to edit properties</p>
        )}
      </aside>
    </div>
  )
}

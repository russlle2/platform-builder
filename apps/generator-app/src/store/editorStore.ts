import { create } from 'zustand'

export interface Component {
  id: string
  type: string
  content: string
  styles?: Record<string, string>
}

interface EditorState {
  components: Component[]
  selectedComponent: string | null
  addComponent: (component: Omit<Component, 'id'>) => void
  removeComponent: (id: string) => void
  updateComponent: (id: string, updates: Partial<Component>) => void
  selectComponent: (id: string | null) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  components: [],
  selectedComponent: null,
  
  addComponent: (component) =>
    set((state) => ({
      components: [
        ...state.components,
        { ...component, id: `component-${Date.now()}` },
      ],
    })),
  
  removeComponent: (id) =>
    set((state) => ({
      components: state.components.filter((c) => c.id !== id),
      selectedComponent: state.selectedComponent === id ? null : state.selectedComponent,
    })),
  
  updateComponent: (id, updates) =>
    set((state) => ({
      components: state.components.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),
  
  selectComponent: (id) =>
    set({ selectedComponent: id }),
}))

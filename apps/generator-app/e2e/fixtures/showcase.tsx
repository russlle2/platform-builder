import { createRoot } from 'react-dom/client'
import { LiveTemplateShowcase } from '../../src/components/niche/LiveTemplateShowcase'
import '../../src/app/globals.css'

createRoot(document.getElementById('root')!).render(
  <LiveTemplateShowcase niche="wellness_coach" nicheLabel="Wellness Coach" totalCount={24} templates={new URLSearchParams(location.search).has('empty') ? [] : [
    { slug: 'calm-studio', name: 'Calm Studio', layoutFamily: 'earthy_warm', snippet: 'A warm welcome for a local practice.' },
    { slug: 'modern-studio', name: 'A very long professional practice homepage name for testing narrow screens', layoutFamily: 'clinical_modern', snippet: 'A clear introduction.' },
  ]} />,
)

import { Suspense } from 'react'
import PreviewYourBusinessClient from './PreviewYourBusinessClient'

export default function PreviewYourBusinessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen pt-24 pb-20 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <PreviewYourBusinessClient />
    </Suspense>
  )
}

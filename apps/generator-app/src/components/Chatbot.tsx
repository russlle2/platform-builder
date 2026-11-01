'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I can help you understand DailyClarity Platform Builder — pricing, preview flow, and launch. What would you like to know?' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true
      inputRef.current?.focus()
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false
      launcherRef.current?.focus()
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = { role: 'user' as const, content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      })

      if (!response.ok) throw new Error('Failed to fetch')

      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting right now. Please try again later." }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div
          id="platform-assistant-dialog"
          role="dialog"
          aria-labelledby="platform-assistant-title"
          aria-describedby="platform-assistant-disclaimer"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              setIsOpen(false)
            }
          }}
          className="mb-3 sm:mb-4 w-[calc(100vw-1.5rem)] max-w-[400px] h-[min(500px,calc(100dvh-6rem))] min-h-[320px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200"
        >
          {/* Header */}
          <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
            <h2 id="platform-assistant-title" className="text-white font-bold flex items-center gap-2">
              <span aria-hidden="true" className="text-2xl">🤖</span> Platform Assistant
            </h2>
            <button
              type="button"
              aria-label="Close Platform Assistant"
              onClick={() => setIsOpen(false)}
              className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div
            role="log"
            aria-label="Platform Assistant conversation"
            aria-live="polite"
            aria-relevant="additions text"
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-gray-100 rounded-bl-none border border-slate-700'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-none px-4 py-3 flex space-x-2">
                  <span className="sr-only">Platform Assistant is responding</span>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 bg-slate-800 border-t border-slate-700">
            <div className="flex gap-2">
              <label htmlFor="platform-assistant-input" className="sr-only">
                Ask the Platform Assistant a question
              </label>
              <input
                ref={inputRef}
                id="platform-assistant-input"
                name="platformAssistantMessage"
                type="text"
                autoComplete="off"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={4000}
                placeholder="Ask a question..."
                className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
              <button
                type="submit"
                aria-label="Send message"
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <div className="text-center mt-2">
               <p id="platform-assistant-disclaimer" className="text-[10px] text-gray-500">
                AI can make mistakes. Do not share sensitive information; verify important details.
              </p>
            </div>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      {!isOpen && (
        <button
          ref={launcherRef}
          type="button"
          aria-label="Open Platform Assistant"
          aria-expanded="false"
          aria-controls="platform-assistant-dialog"
          onClick={() => setIsOpen(true)}
          className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:ring-blue-300"
        >
          <span aria-hidden="true" className="text-2xl sm:text-3xl group-hover:rotate-12 transition-transform">💬</span>
        </button>
      )}
    </div>
  )
}

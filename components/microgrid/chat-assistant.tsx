"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, User, ChevronUp, ChevronDown, FileText, Minimize2 } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu asistente experto en sistemas eléctricos distribuídos, ZNI de Colombia, y algoritmos metaheurísticos. Puedo ayudarte a construir perfiles sintéticos de demanda rurales/urbanos o extraer impedancias de PDF técnicos. ¿En qué te ayudo hoy?'
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isOpen])

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!inputMessage.trim() || isLoading) return

    const userMsg = inputMessage
    setInputMessage('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: messages
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${data.error || 'No se pudo conectar con Gemini.'}` }])
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Ocurrió un error al enviar el mensaje. Verifica tu conexión.' }])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => { setIsOpen(true); setIsMinimized(false); }}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl hover:scale-105 transition-all p-0 flex items-center justify-center bg-blue-600 hover:bg-blue-700 z-50"
      >
        <Bot className="h-7 w-7 text-white" />
      </Button>
    )
  }

  return (
    <Card className={`fixed right-6 bottom-6 w-96 max-w-[calc(100vw-2rem)] shadow-2xl transition-all duration-300 z-50 flex flex-col ${isMinimized ? 'h-[60px]' : 'h-[600px] max-h-[85vh]'}`}>
      <CardHeader className="p-3 border-b flex flex-row items-center justify-between bg-zinc-950 text-white rounded-t-xl cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-400" />
          <CardTitle className="text-sm font-semibold">Gemini IPSE Assistant</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-300 hover:text-white" onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}>
            {isMinimized ? <ChevronUp className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-300 hover:text-red-400" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          <CardContent className="flex-1 overflow-hidden p-0 bg-zinc-50 dark:bg-zinc-900">
            <ScrollArea className="h-full p-4" ref={scrollRef}>
              <div className="flex flex-col gap-4">
                {messages.map((message, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 max-w-[85%] ${message.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}
                  >
                    <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${message.role === 'user' ? 'bg-primary' : 'bg-blue-600'}`}>
                      {message.role === 'user' ? <User className="h-3 w-3 text-white" /> : <Bot className="h-3 w-3 text-white" />}
                    </div>
                    <div className={`p-3 rounded-2xl text-[13px] leading-relaxed ${message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-white dark:bg-zinc-800 border shadow-sm rounded-tl-sm text-foreground'
                      }`}
                      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2 max-w-[80%] self-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center bg-blue-600">
                      <Bot className="h-3 w-3 text-white" />
                    </div>
                    <div className="px-3 py-2 rounded-2xl bg-white dark:bg-zinc-800 border shadow-sm rounded-tl-sm text-foreground flex items-center gap-1">
                      <span className="animate-bounce inline-block w-1.5 h-1.5 bg-current rounded-full"></span>
                      <span className="animate-bounce inline-block w-1.5 h-1.5 bg-current rounded-full" style={{ animationDelay: '0.2s' }}></span>
                      <span className="animate-bounce inline-block w-1.5 h-1.5 bg-current rounded-full" style={{ animationDelay: '0.4s' }}></span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="p-3 border-t bg-white dark:bg-zinc-950 rounded-b-xl">
            <form onSubmit={handleSendMessage} className="flex gap-2 w-full">
              <Input
                placeholder="Escribe tu consulta o pega el texto..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isLoading}
                className="flex-1 rounded-full text-sm focus-visible:ring-blue-500 bg-zinc-100 dark:bg-zinc-900 border-none"
              />
              <Button type="submit" disabled={!inputMessage.trim() || isLoading} className="rounded-full w-10 h-10 p-0 flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </>
      )}
    </Card>
  )
}

"use client"

import React, { useState, useRef, useEffect } from "react"
import { Bird, X, Send, User, ChevronUp, ChevronDown, Minimize2, Wand2 } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Message {
  role: 'user' | 'assistant'
  content: string // Will either be raw text (user) or stringified JSON (assistant)
  file?: {
    inlineData: {
      data: string     // Base64
      mimeType: string // 'application/pdf'
    }
  }
}

interface AIAssistantProps {
  isOpen: boolean
  onClose: () => void
  initialContext?: string
  onApplyParameters?: (params: any) => void
}

export function AIAssistant({ isOpen, onClose, initialContext, onApplyParameters }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: JSON.stringify({
        text_response: '¿En qué te puedo ayudar hoy?',
        has_parameters: false
      })
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isOpen])

  // Enviar contexto inicial si es nuevo
  useEffect(() => {
    if (initialContext && messages.length === 1 && isOpen) {
      // Opcional: auto-enviar un mensaje de contexto oculto o mostrarlo en la UI
      // Para este caso, simplemente lo pre-llenaremos en el input si el usuario lo necesita
      setInputMessage(initialContext)
    }
  }, [initialContext, messages.length, isOpen])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setAttachedFile(file)
    } else {
      alert("Por ahora, solo se soportan archivos PDF.")
    }
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if ((!inputMessage.trim() && !attachedFile) || isLoading) return

    const userMsg = inputMessage || "Analiza el documento adjunto."
    let fileData: Message['file'] = undefined

    if (attachedFile) {
      try {
        const buffer = await attachedFile.arrayBuffer()
        const base64Str = Buffer.from(buffer).toString('base64')
        fileData = {
          inlineData: {
            data: base64Str,
            mimeType: attachedFile.type
          }
        }
      } catch (err) {
        console.error("Error reading file:", err)
      }
    }

    setInputMessage('')
    setAttachedFile(null)
    setMessages(prev => [...prev, { role: 'user', content: userMsg, file: fileData }])
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
        const errorMsg = data.details ? `⚠️ Error: ${data.error} - ${data.details}` : `⚠️ Error: ${data.error || 'No se pudo conectar con Gemini.'}`
        setMessages(prev => [...prev, { role: 'assistant', content: JSON.stringify({ text_response: errorMsg, has_parameters: false }) }])
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: JSON.stringify({ text_response: `⚠️ Ocurrió un error al enviar el mensaje. Verifica tu conexión. Detalles: ${error.message}`, has_parameters: false }) }])
    } finally {
      setIsLoading(false)
    }
  }

  // Renderizador de burbujas seguro
  const renderMessageContent = (msg: Message) => {
    if (msg.role === 'user') return msg.content

    try {
      const data = JSON.parse(msg.content)
      const text = data.text_response || msg.content
      const hasParams = data.has_parameters && data.parameters_to_inject

      return (
        <div className="flex flex-col gap-3">
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text}</div>
          {hasParams && onApplyParameters && (
            <div className="mt-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-xs font-semibold text-zinc-500 mb-2">Parámetros encontrados:</p>
              <div className="bg-zinc-100 dark:bg-zinc-950 rounded p-2 text-xs font-mono text-zinc-600 dark:text-zinc-400 mb-3 overflow-x-auto">
                {JSON.stringify(data.parameters_to_inject, null, 2)}
              </div>
              <Button
                onClick={() => onApplyParameters(data.parameters_to_inject)}
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-sm"
              >
                <Wand2 className="h-4 w-4" />
                Aplicar Parámetros al Proyecto
              </Button>
            </div>
          )}
        </div>
      )
    } catch (e) {
      // Fallback a texto normal si no es JSON
      return <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl border-blue-500/20 bg-zinc-50 dark:bg-zinc-950 overflow-hidden relative">
        <CardHeader className="p-4 border-b flex flex-row items-center justify-between bg-zinc-950 text-white m-0">
          <div className="flex items-center gap-2">
            <Bird className="h-6 w-6 text-amber-500" />
            <div>
              <CardTitle className="text-base font-semibold">MicroGrid AI Agent</CardTitle>
              <p className="text-[11px] text-zinc-400 font-normal">Powered by Gemini 2.5 Flash (Web Search + AutoFill)</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-300 hover:text-red-400 hover:bg-zinc-800 rounded-full" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden relative">
          <ScrollArea className="h-full w-full p-4" ref={scrollRef}>
            <div className="flex flex-col gap-5 pb-4">
              {messages.map((message, i) => (
                <div
                  key={i}
                  className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}
                >
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center shadow-sm ${message.role === 'user' ? 'bg-blue-600' : 'bg-amber-500'}`}>
                    {message.role === 'user' ? <User className="h-4 w-4 text-white" /> : <Bird className="h-4 w-4 text-white" />}
                  </div>
                  <div className={`p-4 rounded-2xl text-[14px] leading-relaxed shadow-sm ${message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-tl-sm text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    {message.file && message.role === 'user' && (
                      <div className="flex items-center gap-2 mb-2 p-2 bg-blue-700/50 rounded text-xs">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        PDF Adjunto enviado
                      </div>
                    )}
                    {renderMessageContent(message)}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 max-w-[80%] self-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-amber-500 shadow-sm">
                    <Bird className="h-4 w-4 text-white" />
                  </div>
                  <div className="px-5 py-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-tl-sm flex items-center gap-1.5 min-h-[52px]">
                    <span className="animate-bounce inline-block w-2 h-2 bg-primary rounded-full"></span>
                    <span className="animate-bounce inline-block w-2 h-2 bg-primary rounded-full" style={{ animationDelay: '0.2s' }}></span>
                    <span className="animate-bounce inline-block w-2 h-2 bg-primary rounded-full" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter className="p-0 border-t bg-white dark:bg-zinc-950 flex flex-col items-start gap-0">
          {attachedFile && (
            <div className="px-4 py-2 w-full flex items-center justify-between bg-zinc-50 border-b border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 truncate">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span className="truncate max-w-[200px]">{attachedFile.name}</span>
              </div>
              <button type="button" onClick={() => setAttachedFile(null)} className="text-zinc-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="flex gap-2 w-full items-center p-3">
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="text-zinc-400 hover:text-primary shrink-0"
              title="Adjuntar PDF (Catálogos, reportes)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            </Button>
            <Input
              placeholder="Escribe o pega texto..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading}
              className="flex-1 rounded-full text-sm bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 h-10 px-4 focus-visible:ring-1 focus-visible:ring-primary"
            />
            <Button type="submit" disabled={(!inputMessage.trim() && !attachedFile) || isLoading} className="rounded-full w-10 h-10 p-0 flex-shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-transform active:scale-95">
              <Send className="h-4 w-4 ml-1" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}

// Botón flotante para abrir el asistente
export function AIAssistantButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl z-40 p-0 flex flex-col items-center justify-center bg-amber-500 hover:bg-amber-600 hover:scale-105 transition-all duration-300 border-4 border-white dark:border-zinc-950 group"
    >
      <Bird className="h-7 w-7 text-white mb-0.5 group-hover:animate-pulse" />
      <span className="text-[9px] font-bold text-white/90 uppercase tracking-wider">Ayuda</span>
    </Button>
  )
}

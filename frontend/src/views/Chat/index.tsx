import React, { useRef, useState, useCallback, useEffect } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import ChatMessages, { Message } from "./ChatMessages"
import ChatInput from "./ChatInput"
import CodeModal from './CodeModal'
import { useAtom, useSetAtom } from 'jotai'
import { codeStreamingAtom } from '../../atoms/codeStreaming'
import useHotkeyEvent from "../../hooks/useHotkeyEvent"
import { useSidebarLayer } from "../../hooks/useLayer"
import { showToastAtom } from "../../atoms/toastState"
import { useTranslation } from "react-i18next"
import { currentChatIdAtom, isChatStreamingAtom, lastMessageAtom } from "../../atoms/chatState"
import { safeBase64Encode } from "../../util"
import { closeAllOverlaysAtom, openOverlayAtom, OverlayType } from "../../atoms/layerState"
import { sidebarVisibleAtom } from "../../atoms/sidebarState"

interface ToolCall {
  name: string
  arguments: any
}

interface ToolResult {
  name: string
  result: any
}


const ChatWindow = () => {
  const { chatId } = useParams()
  const location = useLocation()
  const [messages, setMessages] = useState<Message[]>([])
  const currentId = useRef(0)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const currentChatId = useRef<string | null>(null)
  const navigate = useNavigate()
  const isInitialMessageHandled = useRef(false)
  const showToast = useSetAtom(showToastAtom)
  const { t } = useTranslation()
  const updateStreamingCode = useSetAtom(codeStreamingAtom)
  const setLastMessage = useSetAtom(lastMessageAtom)
  const setCurrentChatId = useSetAtom(currentChatIdAtom)
  const [isChatStreaming, setIsChatStreaming] = useAtom(isChatStreamingAtom)
  const toolCallResults = useRef<string>("")
  const toolResultCount = useRef(0)
  const toolResultTotal = useRef(0)
  const _openOverlay = useSetAtom(openOverlayAtom)
  const [isVisible, setVisible] = useSidebarLayer(sidebarVisibleAtom)


	// tool button
	const handleTools = () => {
		openOverlay("Tools")
	}

const openOverlay = useCallback((overlay: OverlayType) => {
    _openOverlay(overlay)
    setVisible(false)
  }, [_openOverlay, setVisible])

  const loadChat = useCallback(async (id: string) => {
    try {
      setIsChatStreaming(true)
      const response = await fetch(`/api/chat/${id}`)
      const data = await response.json()

      if (data.success) {
        currentChatId.current = id
        document.title = `${data.data.chat.title} - Patrick`

        const convertedMessages = data.data.messages.map((msg: any) => ({
          id: msg.messageId || msg.id || String(currentId.current++),
          text: msg.content,
          isSent: msg.role === "user",
          timestamp: new Date(msg.createdAt).getTime(),
          files: msg.files
        }))

        setMessages(convertedMessages)
      }
    } catch (error) {
      console.warn("Failed to load chat:", error)
    } finally {
      setIsChatStreaming(false)
    }
  }, [])

  useHotkeyEvent("chat-message:copy-last", async () => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage) {
      await navigator.clipboard.writeText(lastMessage.text)
      showToast({
        message: t("toast.copiedToClipboard"),
        type: "success"
      })
    }
  })

  useEffect(() => {
    if (messages.length > 0 && !isChatStreaming) {
      setLastMessage(messages[messages.length - 1].text)
    }
  }, [messages, setLastMessage, isChatStreaming])

  useEffect(() => {
    if (chatId && chatId !== currentChatId.current) {
      loadChat(chatId)
      setCurrentChatId(chatId)
    }
  }, [chatId, loadChat, setCurrentChatId])

  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [])

  const onSendMsg = useCallback(async (msg: string, files?: FileList) => {
    if (isChatStreaming) return

    const formData = new FormData()
    if (msg) formData.append("message", msg)
    if (currentChatId.current) formData.append("chatId", currentChatId.current)
    if (files) {
      Array.from(files).forEach(file => {
        formData.append("files", file)
      })
    }

    const userMessage: Message = {
      id: `${currentId.current++}`,
      text: msg,
      isSent: true,
      timestamp: Date.now(),
      files: files ? Array.from(files) : undefined
    }

    const aiMessage: Message = {
      id: `${currentId.current++}`,
      text: "",
      isSent: false,
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage, aiMessage])
    setIsChatStreaming(true)
    scrollToBottom()

    handlePost(formData, "formData", "/api/chat")
  }, [isChatStreaming, scrollToBottom])

  const onAbort = useCallback(async () => {
    if (!isChatStreaming || !currentChatId.current) return

    try {
      await fetch(`/api/chat/${currentChatId.current}/abort`, {
        method: "POST",
      })
    } catch (error) {
      console.error("Failed abort:", error)
    }
  }, [isChatStreaming, currentChatId.current, scrollToBottom])

  const onRetry = useCallback(async (messageId: string) => {
    if (isChatStreaming || !currentChatId.current) return

    let prevMessages = {} as Message
    setMessages(prev => {
      let newMessages = [...prev]
      const messageIndex = newMessages.findIndex(msg => msg.id === messageId)
      if (messageIndex !== -1) {
        prevMessages = newMessages[messageIndex]
        prevMessages.text = ""
        prevMessages.isError = false
        newMessages = newMessages.slice(0, messageIndex)
      }
      return newMessages
    })

    await new Promise(resolve => setTimeout(resolve, 0))

    setMessages(prev => {
      const newMessages = [...prev]
      newMessages.push(prevMessages)
      return newMessages
    })
    setIsChatStreaming(true)
    scrollToBottom()

    const body = JSON.stringify({
      chatId: currentChatId.current,
      messageId: messageId,
    })

    handlePost(body, "json", "/api/chat/retry")
  }, [isChatStreaming, currentChatId.current])

  const onEdit = useCallback(async (messageId: string, newText: string) => {
    if (isChatStreaming || !currentChatId.current)
      return
    let prevMessages = {} as Message
    setMessages(prev => {
      let newMessages = [...prev]
      const messageIndex = newMessages.findIndex(msg => msg.id === messageId)
      if (messageIndex !== -1) {
        prevMessages = newMessages[messageIndex + 1]
        prevMessages.text = ""
        prevMessages.isError = false
        newMessages = newMessages.slice(0, messageIndex+1)
      }
      return newMessages
    })

    await new Promise(resolve => setTimeout(resolve, 0))

    setMessages(prev => {
      const newMessages = [...prev]
      newMessages.push(prevMessages)
      return newMessages
    })
    setIsChatStreaming(true)
    scrollToBottom()

    const body = JSON.stringify({
      chatId: currentChatId.current,
      messageId,
      content: newText,
    })

    handlePost(body, "json", "/api/chat/edit")
  }, [isChatStreaming, currentChatId.current])

  const handlePost = useCallback(async (body: any, type: "json" | "formData", url: string) => {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: type === "json" ? {
          "Content-Type": "application/json",
        } : {},
        body: body
      })

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let currentText = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) {
          break
        }

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.trim() === "" || !line.startsWith("data: "))
            continue

          const dataStr = line.slice(5)
          if (dataStr.trim() === "[DONE]")
            break

          try {
            const dataObj = JSON.parse(dataStr)
            if (dataObj.error) {
              setMessages(prev => {
                const newMessages = [...prev]
                newMessages[newMessages.length - 1] = {
                  id: `${currentId.current++}`,
                  text: `Error: ${dataObj.error}`,
                  isSent: false,
                  timestamp: Date.now(),
                  isError: true
                }
                return newMessages
              })
              break
            }

            const data = JSON.parse(dataObj.message)
            switch (data.type) {
              case "text":
                currentText += data.content
                setMessages(prev => {
                  const newMessages = [...prev]
                  newMessages[newMessages.length - 1].text = currentText
                  return newMessages
                })
                scrollToBottom()
                break

              case "tool_calls":
                const toolCalls = data.content as ToolCall[]

                const tools = data.content?.map((call: {name: string}) => call.name) || []
                toolResultTotal.current = tools.length

                const uniqTools = new Set(tools)
                const toolName = uniqTools.size === 0 ? "%name%" : Array.from(uniqTools).join(", ")

                toolCallResults.current += `\n<tool-call name="${toolName}">##Tool Calls:${safeBase64Encode(JSON.stringify(toolCalls))}`
                setMessages(prev => {
                  const newMessages = [...prev]
                  newMessages[newMessages.length - 1].text = currentText + toolCallResults.current + "</tool-call>"
                  return newMessages
                })
                break

              case "tool_result":
                const result = data.content as ToolResult

                toolCallResults.current = toolCallResults.current.replace(`</tool-call>\n`, "")
                toolCallResults.current += `##Tool Result:${safeBase64Encode(JSON.stringify(result.result))}</tool-call>\n`

                setMessages(prev => {
                  const newMessages = [...prev]
                  newMessages[newMessages.length - 1].text = currentText + toolCallResults.current.replace("%name%", result.name)
                  return newMessages
                })

                toolResultCount.current++
                if (toolResultTotal.current === toolResultCount.current) {
                  currentText += toolCallResults.current.replace("%name%", result.name)
                  toolCallResults.current = ""
                  toolResultTotal.current = 0
                  toolResultCount.current = 0
                }

                break

              case "chat_info":
                document.title = `${data.content.title} - Patrick`
                currentChatId.current = data.content.id
                navigate(`/chat/${data.content.id}`, { replace: true })
                break

              case "message_info":
                setMessages(prev => {
                  const newMessages = [...prev]
                  if(data.content.userMessageId) {
                    newMessages[newMessages.length - 2].id = data.content.userMessageId
                  }
                  if(data.content.assistantMessageId) {
                    newMessages[newMessages.length - 1].id = data.content.assistantMessageId
                  }
                  return newMessages
                })
                break

              case "error":
                setMessages(prev => {
                  const newMessages = [...prev]
                  newMessages[newMessages.length - 1] = {
                    id: `${currentId.current++}`,
                    text: `Error: ${data.content}`,
                    isSent: false,
                    timestamp: Date.now(),
                    isError: true
                  }
                  return newMessages
                })
                break
            }
          } catch (error) {
            console.warn(error)
          }
        }
      }
    } catch (error: any) {
      setMessages(prev => {
        const newMessages = [...prev]
        newMessages[newMessages.length - 1] = {
          id: `${currentId.current++}`,
          text: `Error: ${error.message}`,
          isSent: false,
          timestamp: Date.now(),
          isError: true
        }
        return newMessages
      })
    } finally {
      setIsChatStreaming(false)
      scrollToBottom()
    }
  }, [])

  const handleInitialMessage = useCallback(async (message: string, files?: File[]) => {
    if (files && files.length > 0) {
      const fileList = new DataTransfer()
      files.forEach(file => fileList.items.add(file))
      await onSendMsg(message, fileList.files)
    } else {
      await onSendMsg(message)
    }
    navigate(location.pathname, { replace: true, state: {} })
  }, [onSendMsg, navigate, location.pathname])

  useEffect(() => {
    const state = location.state as { initialMessage?: string, files?: File[] } | null

    if ((state?.initialMessage || state?.files) && !isInitialMessageHandled.current) {
      isInitialMessageHandled.current = true
      handleInitialMessage(state?.initialMessage || '', state?.files)
    }
  }, [handleInitialMessage])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const lastChatId = useRef(chatId)
  useEffect(() => {
    if (lastChatId.current && lastChatId.current !== chatId) {
      updateStreamingCode(null)
    }

    lastChatId.current = chatId
  }, [updateStreamingCode, chatId])

  return (

    <div className="chat-page">
      <div className="chat-container">
        <div className="chat-window">
          <ChatMessages
            messages={messages}
            isLoading={isChatStreaming}
            onRetry={onRetry}
            onEdit={onEdit}
          />
          <ChatInput
            onSendMessage={onSendMsg}
            disabled={isChatStreaming}
            onAbort={onAbort}
          />
        </div>
      </div>
      <CodeModal />
			
    </div>

  )
}

export default React.memo(ChatWindow)

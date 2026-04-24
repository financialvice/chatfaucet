import { useEffect, useRef, useState } from "react"
import { Link } from "@tanstack/react-router"
import { useAgent } from "agents/react"
import { useAgentChat } from "@cloudflare/ai-chat/react"
import Window from "../srcl/components/Window"
import Card from "../srcl/components/Card"
import Button from "../srcl/components/Button"
import Input from "../srcl/components/Input"
import BlockLoader from "../srcl/components/BlockLoader"
import BarLoader from "../srcl/components/BarLoader"
import Message from "../srcl/components/Message"
import MessageViewer from "../srcl/components/MessageViewer"
import RowSpaceBetween from "../srcl/components/RowSpaceBetween"
import { ThemeToggle } from "../srcl/theme"
import styles from "./Playground.module.css"

export function Playground() {
  const [input, setInput] = useState("")
  const scrollerRef = useRef<HTMLDivElement | null>(null)

  const agent = useAgent({ agent: "PlaygroundAgent", name: "self" })
  const { messages, sendMessage, status, clearHistory, isStreaming } =
    useAgentChat({ agent })

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages, isStreaming])

  const sending = status === "streaming" || status === "submitted"

  return (
    <Window>
      <div className={styles.stack}>
        <RowSpaceBetween>
          <span>Chat Faucet / Playground</span>
          <span className={styles.inlineActions}>
            <Link to="/">dashboard</Link>
            <button
              type="button"
              onClick={() => clearHistory()}
              className={styles.linkButton}
            >
              clear
            </button>
            <ThemeToggle />
          </span>
        </RowSpaceBetween>

        <Card title="TEST CHAT">
          <div className={styles.chat} ref={scrollerRef}>
            {messages.map((m) => {
              const text = m.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("")
              if (!text) return null
              return m.role === "user" ? (
                <MessageViewer key={m.id}>{text}</MessageViewer>
              ) : (
                <Message key={m.id}>{text}</Message>
              )
            })}
            {isStreaming &&
              messages[messages.length - 1]?.role !== "assistant" && (
                <Message>
                  Thinking <BlockLoader mode={1} />
                </Message>
              )}
          </div>
          {isStreaming && <BarLoader progress={66} />}
          <form
            className={styles.composer}
            onSubmit={(e) => {
              e.preventDefault()
              const text = input.trim()
              if (!text || sending) return
              sendMessage({ role: "user", parts: [{ type: "text", text }] })
              setInput("")
            }}
          >
            <Input
              autoComplete="off"
              label="MESSAGE"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ask something tiny"
              disabled={sending}
              isBlink={!sending}
              caretChars={sending ? <BlockLoader mode={6} /> : ""}
            />
            <Button type="submit" isDisabled={sending}>
              Send
            </Button>
          </form>
        </Card>
      </div>
    </Window>
  )
}

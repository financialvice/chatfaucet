import { useAgentChat } from "@cloudflare/ai-chat/react";
import { Link } from "@tanstack/react-router";
import { useAgent } from "agents/react";
import { type RefObject, Suspense, useEffect, useRef, useState } from "react";
import BarLoader from "../srcl/components/BarLoader";
import BlockLoader from "../srcl/components/BlockLoader";
import Button from "../srcl/components/Button";
import Card from "../srcl/components/Card";
import Input from "../srcl/components/Input";
import Message from "../srcl/components/Message";
import MessageViewer from "../srcl/components/MessageViewer";
import RowSpaceBetween from "../srcl/components/RowSpaceBetween";
import Window from "../srcl/components/Window";
import { ThemeToggle } from "../srcl/theme";
import styles from "./Playground.module.css";

export function Playground() {
  // useAgentChat suspends its first render while it fetches /get-messages.
  // Hold clearHistory in a ref so the top-bar button stays mounted through
  // the suspense swap, keeping the page chrome stable.
  const clearRef = useRef<(() => void) | null>(null);

  return (
    <Window>
      <div className={styles.stack}>
        <RowSpaceBetween>
          <span>Chat Faucet / Playground</span>
          <span className={styles.inlineActions}>
            <Link to="/">dashboard</Link>
            <button
              className={styles.linkButton}
              onClick={() => clearRef.current?.()}
              type="button"
            >
              clear
            </button>
            <ThemeToggle />
          </span>
        </RowSpaceBetween>

        <Card title="TEST CHAT">
          <Suspense fallback={<ChatFallback />}>
            <ChatBody clearRef={clearRef} />
          </Suspense>
        </Card>
      </div>
    </Window>
  );
}

function ChatFallback() {
  return (
    <>
      <div className={styles.chat}>
        <Message>
          Loading <BlockLoader mode={1} />
        </Message>
      </div>
      <form className={styles.composer} onSubmit={(e) => e.preventDefault()}>
        <Input
          autoComplete="off"
          disabled
          isBlink={false}
          label="MESSAGE"
          placeholder="ask something tiny"
          value=""
        />
        <Button isDisabled type="submit">
          Send
        </Button>
      </form>
    </>
  );
}

function ChatBody({ clearRef }: { clearRef: RefObject<(() => void) | null> }) {
  const [input, setInput] = useState("");
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const agent = useAgent({ agent: "PlaygroundAgent", name: "self" });
  const { messages, sendMessage, status, clearHistory, isStreaming } =
    useAgentChat({ agent });

  clearRef.current = clearHistory;

  const messageCount = messages.length;
  useEffect(() => {
    if (!(scrollerRef.current && messageCount)) return;
    scrollerRef.current.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: isStreaming ? "instant" : "smooth",
    });
  }, [messageCount, isStreaming]);

  const sending = status === "streaming" || status === "submitted";

  return (
    <>
      <div className={styles.chat} ref={scrollerRef}>
        {messages.map((m) => {
          const text = m.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("");
          if (!text) {
            return null;
          }
          return m.role === "user" ? (
            <MessageViewer key={m.id}>{text}</MessageViewer>
          ) : (
            <Message key={m.id}>{text}</Message>
          );
        })}
        {isStreaming && messages.at(-1)?.role !== "assistant" && (
          <Message>
            Thinking <BlockLoader mode={1} />
          </Message>
        )}
      </div>
      {isStreaming && <BarLoader progress={66} />}
      <form
        className={styles.composer}
        onSubmit={(e) => {
          e.preventDefault();
          const text = input.trim();
          if (!text || sending) {
            return;
          }
          sendMessage({ role: "user", parts: [{ type: "text", text }] });
          setInput("");
        }}
      >
        <Input
          autoComplete="off"
          caretChars={sending ? <BlockLoader mode={6} /> : ""}
          disabled={sending}
          isBlink={!sending}
          label="MESSAGE"
          onChange={(e) => setInput(e.target.value)}
          placeholder="ask something tiny"
          value={input}
        />
        <Button isDisabled={sending} type="submit">
          Send
        </Button>
      </form>
    </>
  );
}

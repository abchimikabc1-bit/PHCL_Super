import { useEffect, useRef } from "react"

export const useScrollToBottom = <T extends any[]>(dependencies: T) => {
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  return { bottomRef, scrollToBottom }
}

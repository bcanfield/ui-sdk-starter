function AgentTrace({
  traceRef,
}: {
  traceRef: (element: HTMLElement | null) => (() => void) | undefined
}) {
  return (
    <div className="agent-trace" data-agent-trace aria-hidden="true" ref={traceRef}>
      <span className="eyebrow agent-trace-tag">agent</span>
    </div>
  )
}

export { AgentTrace }

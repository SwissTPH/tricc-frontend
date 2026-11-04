import type { ReactNode } from 'react'

export interface InspectorTab {
  id: string
  label: string
  /** A badge beside the label; hidden at 0. */
  count?: number
  countTitle?: string
  content: ReactNode
}

/**
 * The right-hand panel of the flow and project pages: a row of tabs over one panel.
 * Tab `x` is `#tab-x` / `[data-testid=tab-x]`, its panel `#inspector-x`.
 */
export function InspectorPanel({
  tabs,
  active,
  onSelect,
  label = 'Inspector',
  className,
}: {
  tabs: InspectorTab[]
  active: string
  onSelect: (id: string) => void
  label?: string
  className?: string
}) {
  const current = tabs.find((t) => t.id === active) ?? tabs[0]
  return (
    <aside className={`tricc-inspector${className ? ` ${className}` : ''}`}>
      <div className="tricc-inspector__tabs" role="tablist" aria-label={label}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            data-testid={`tab-${tab.id}`}
            aria-selected={tab.id === current?.id}
            aria-controls={`inspector-${tab.id}`}
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="tricc-inspector__count" title={tab.countTitle}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {current && (
        <div role="tabpanel" id={`inspector-${current.id}`} aria-labelledby={`tab-${current.id}`}>
          {current.content}
        </div>
      )}
    </aside>
  )
}

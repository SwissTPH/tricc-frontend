import type { ReactNode } from 'react'
import { SidePanel, type PanelLayout } from './SidePanel.js'

export interface InspectorTab {
  id: string
  label: string
  /** A badge beside the label; hidden at 0. */
  count?: number
  countTitle?: string
  content: ReactNode
}

/**
 * The right-hand panel of the project page: a row of tabs over one panel, resizable and
 * collapsible through `layout` (see SidePanel).
 * Tab `x` is `#tab-x` / `[data-testid=tab-x]`, its panel `#inspector-x`.
 */
export function InspectorPanel({
  tabs,
  active,
  onSelect,
  layout,
  label = 'Inspector',
  className,
}: {
  tabs: InspectorTab[]
  active: string
  onSelect: (id: string) => void
  layout: PanelLayout
  label?: string
  className?: string
}) {
  const current = tabs.find((t) => t.id === active) ?? tabs[0]
  return (
    <SidePanel
      layout={layout}
      label={label}
      active={current?.id}
      className={className}
      tabs={tabs.map((tab) => (
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
    >
      {current && (
        <div role="tabpanel" id={`inspector-${current.id}`} aria-labelledby={`tab-${current.id}`}>
          {current.content}
        </div>
      )}
    </SidePanel>
  )
}

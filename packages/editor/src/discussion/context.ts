import { createContext, useContext } from 'react'

/** Opens the Discussion tab on an element of the activity that is on screen. */
export interface DiagramDiscuss {
  activityId: string
  open: (kind: 'node' | 'edge' | 'group' | 'comment' | 'activity', id: string) => void
}

export const DiagramDiscussContext = createContext<DiagramDiscuss | undefined>(undefined)

export function useDiagramDiscuss(): DiagramDiscuss | undefined {
  return useContext(DiagramDiscussContext)
}

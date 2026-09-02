import { TriccNodeType } from '../../../types'

export const getNodeColor = (nodeType: TriccNodeType): string => {
  switch (nodeType) {
    case TriccNodeType.START:
    case TriccNodeType.ACTIVITY_START:
      return '#4caf50' // green
    case TriccNodeType.END:
    case TriccNodeType.ACTIVITY_END:
      return '#f44336' // red
    case TriccNodeType.CALCULATE:
      return '#2196f3' // blue
    case TriccNodeType.TEXT:
    case TriccNodeType.DECIMAL:
    case TriccNodeType.INTEGER:
    case TriccNodeType.DATE:
      return '#ff9800' // orange
    case TriccNodeType.SELECT_ONE:
    case TriccNodeType.SELECT_MULTIPLE:
      return '#9c27b0' // purple
    default:
      return '#757575' // grey
  }
}

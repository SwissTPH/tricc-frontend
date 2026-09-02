import {
  PlayArrow as StartIcon,
  Stop as EndIcon,
  Calculate as CalculateIcon,
  TextFields as TextIcon,
  CheckBox as SelectIcon,
  Numbers as NumberIcon,
  CalendarToday as DateIcon,
  Note as NoteIcon,
} from '@mui/icons-material'
import { TriccNodeType } from '../../../types'

export const getNodeIcon = (nodeType: TriccNodeType): JSX.Element => {
  switch (nodeType) {
    case TriccNodeType.START:
    case TriccNodeType.ACTIVITY_START:
      return <StartIcon />
    case TriccNodeType.END:
    case TriccNodeType.ACTIVITY_END:
      return <EndIcon />
    case TriccNodeType.CALCULATE:
      return <CalculateIcon />
    case TriccNodeType.TEXT:
      return <TextIcon />
    case TriccNodeType.SELECT_ONE:
    case TriccNodeType.SELECT_MULTIPLE:
      return <SelectIcon />
    case TriccNodeType.DECIMAL:
    case TriccNodeType.INTEGER:
      return <NumberIcon />
    case TriccNodeType.DATE:
      return <DateIcon />
    default:
      return <NoteIcon />
  }
}

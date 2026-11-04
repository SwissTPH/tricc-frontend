import { useState } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import { normalizeLabels, parseLabels } from '@tricc/core'

/** Free labels as chips; a comma (or Enter) ends one. */
export function LabelsField({
  value,
  onChange,
  suggestions,
  testId = 'labels',
  label = 'Labels',
  disabled,
  size,
}: {
  value: string[]
  onChange: (labels: string[]) => void
  suggestions: string[]
  testId?: string
  label?: string
  disabled?: boolean
  size?: 'small' | 'medium'
}) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  return (
    <Autocomplete
      multiple
      freeSolo
      disabled={disabled}
      size={size}
      filterSelectedOptions
      options={suggestions}
      value={value}
      inputValue={input}
      // Suggestions only while typing, so the list never sits over the dialog's buttons.
      open={open && input.trim() !== ''}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      onInputChange={(_, text) => {
        if (text.includes(',')) {
          onChange(normalizeLabels([...value, ...parseLabels(text)]))
          setInput('')
        } else setInput(text)
      }}
      onChange={(_, next) => onChange(normalizeLabels(next as string[]))}
      onBlur={() => {
        if (input.trim()) onChange(normalizeLabels([...value, input]))
        setInput('')
      }}
      renderValue={(selected, getItemProps) =>
        selected.map((option, index) => {
          const { key, ...rest } = getItemProps({ index })
          return <Chip key={key} label={option} size="small" {...rest} />
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          helperText="Separate labels with a comma."
          inputProps={{ ...params.inputProps, 'data-testid': testId }}
        />
      )}
    />
  )
}

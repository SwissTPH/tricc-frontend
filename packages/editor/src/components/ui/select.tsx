import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'

import { cn } from '../../lib/utils.js'
import { Icon } from '../../theme/Icon.js'

/**
 * shadcn/ui Select, on Radix. Its menu opens above the editor's modals (the concept dialog,
 * the text popups), so it sits on the top layer. Radix gives no item an empty value: callers
 * map "none" to a sentinel of their own.
 */
const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

// React 18 does not pass `ref` through as a prop, so this keeps shadcn's forwardRef form.
const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & { size?: 'sm' | 'default' }
>(({ className, children, size = 'default', ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    data-slot="select-trigger"
    data-size={size}
    className={cn(
      'border-input data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit min-w-0 items-center justify-between gap-2 rounded-md border bg-transparent whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2',
      // Set here rather than through data-size variants, which lost to the inherited size.
      size === 'sm' ? 'h-7 px-2 text-xs' : 'h-9 px-3 text-sm',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <Icon name="expand_more" size={16} className="shrink-0 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      data-slot="select-content"
      className={cn(
        'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 relative z-[1400] max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border shadow-md',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className,
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          'p-1',
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1',
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    data-slot="select-label"
    className={cn('text-muted-foreground px-2 py-1.5 text-xs', className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    data-slot="select-item"
    className={cn(
      'focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute right-2 flex size-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Icon name="check" size={16} />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    data-slot="select-separator"
    className={cn('bg-border pointer-events-none -mx-1 my-1 h-px', className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}

/** One choice of a `SimpleSelect`. An empty `value` is allowed: it stands for "none". */
export interface SimpleOption {
  value: string
  label: React.ReactNode
}

/** Radix gives no item an empty value; `SimpleSelect` maps "" to this and back. */
const NONE = ':none'

/**
 * A shadcn Select from a list of options, in place of a native `<select>`: `value` and
 * `onValueChange` take plain strings, "" included. The trigger carries `id`, the test id and
 * the current value (`data-value`); each option the test id `<testId>-option-<value or none>`.
 */
export function SimpleSelect({
  id,
  testId,
  value,
  options,
  onValueChange,
  disabled,
  ariaLabel,
  size = 'default',
  className,
}: {
  id?: string
  testId?: string
  value: string
  options: SimpleOption[]
  onValueChange: (value: string) => void
  disabled?: boolean
  ariaLabel?: string
  size?: 'sm' | 'default'
  className?: string
}) {
  const encode = (v: string) => (v === '' ? NONE : v)
  return (
    <Select
      value={encode(value)}
      disabled={disabled}
      onValueChange={(v) => onValueChange(v === NONE ? '' : v)}
    >
      <SelectTrigger
        id={id}
        size={size}
        aria-label={ariaLabel}
        data-testid={testId}
        data-value={value}
        className={cn('w-full', className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem
            key={encode(o.value)}
            value={encode(o.value)}
            data-testid={
              testId ? `${testId}-option-${o.value === '' ? 'none' : o.value}` : undefined
            }
          >
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

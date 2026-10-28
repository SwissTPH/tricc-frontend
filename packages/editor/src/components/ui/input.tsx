import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils.js'

const inputVariants = cva(
  'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-transparent shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
  {
    variants: {
      size: {
        default: 'h-9 px-3 py-1 text-base md:text-sm',
        // The editor's inspector and toolbars are dense; this matches their 12px type.
        sm: 'h-7 px-2 py-0.5 text-xs',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
)

// `size` is taken by the variant; the native attribute is still reachable as `htmlSize`.
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  htmlSize?: number
}

// React 18 does not pass `ref` through as a prop, so this keeps shadcn's forwardRef form.
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size, htmlSize, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        size={htmlSize}
        data-slot="input"
        className={cn(inputVariants({ size, className }))}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input, inputVariants }

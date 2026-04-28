import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:          'border-transparent bg-brand-600 text-white shadow-sm',
        secondary:        'border-transparent bg-gray-100 text-gray-600',
        destructive:      'border-transparent bg-red-600 text-white shadow-sm',
        outline:          'border-gray-200 text-gray-600',
        pending:          'border-yellow-200 bg-yellow-50 text-yellow-700',
        accepted:         'border-green-200 bg-green-50 text-green-700',
        declined:         'border-red-200 bg-red-50 text-red-700',
        returned:         'border-blue-200 bg-blue-50 text-blue-700',
        canceled:         'border-gray-200 bg-gray-100 text-gray-500',
        completed:        'border-purple-200 bg-purple-50 text-purple-700',
        arrived_canceled: 'border-orange-200 bg-orange-50 text-orange-700',
        urgent:           'border-orange-200 bg-orange-50 text-orange-700',
        emergency:        'border-red-300 bg-red-100 text-red-700',
        standard:         'border-gray-200 bg-gray-100 text-gray-500',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }

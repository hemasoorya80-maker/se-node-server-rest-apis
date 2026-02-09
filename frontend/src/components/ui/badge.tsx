import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-[hsl(262.1,83.3%,57.8%)] text-white [a&]:hover:bg-[hsl(262.1,83.3%,50%)]",
        secondary:
          "bg-gray-100 text-gray-900 [a&]:hover:bg-gray-200",
        destructive:
          "bg-red-500 text-white [a&]:hover:bg-red-600 focus-visible:ring-red-500/20",
        outline:
          "border-gray-300 text-gray-900 [a&]:hover:bg-gray-100 [a&]:hover:text-gray-900",
        ghost: "[a&]:hover:bg-gray-100 [a&]:hover:text-gray-900",
        link: "text-[hsl(262.1,83.3%,57.8%)] underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

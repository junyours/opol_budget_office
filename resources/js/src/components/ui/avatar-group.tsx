import * as React from "react"
import { cn } from "@/src/lib/utils"

interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex -space-x-2 overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
AvatarGroup.displayName = "AvatarGroup"

interface AvatarGroupCountProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
}

const AvatarGroupCount = React.forwardRef<HTMLSpanElement, AvatarGroupCountProps>(
  ({ className, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-medium",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
)
AvatarGroupCount.displayName = "AvatarGroupCount"

export { AvatarGroup, AvatarGroupCount }
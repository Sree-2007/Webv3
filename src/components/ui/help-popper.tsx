"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

export interface HelpPopperItem {
  /** Rendered in a 16px box. Any node: an icon, an emoji, an avatar. */
  icon?: React.ReactNode
  label: string
  /** Right-aligned hint, e.g. a keyboard shortcut. */
  shortcut?: React.ReactNode
  /** Adds the little "leaves the app" arrow. */
  external?: boolean
  onSelect?: () => void
}

export interface HelpPopperHighlight {
  icon?: React.ReactNode
  label: string
  /** Trailing text, e.g. "2/5" progress. */
  meta?: React.ReactNode
  onSelect?: () => void
}

export interface HelpPopperSection {
  title: string
  items: HelpPopperItem[]
}

export interface HelpPopperProps {
  items?: HelpPopperItem[]
  /** Accented row pinned above the list, separated by a divider. */
  highlight?: HelpPopperHighlight
  /** Extra lists under their own muted heading. */
  sections?: HelpPopperSection[]
  /** The blue dot on the trigger: something is waiting inside. */
  showDot?: boolean
  /**
   * Change this value to make the trigger bounce once. Use it when something
   * animates *into* the button, so the eye follows where it landed.
   */
  bumpSignal?: unknown
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  sideOffset?: number
  alignOffset?: number
  /** Let the menu flip to the opposite side when it would clip. Off when the
   *  surrounding layout guarantees room and the side is part of the design. */
  avoidCollisions?: boolean
  /** Render the menu inside this element instead of the body. Useful when the
   *  popper lives in a scoped surface: a bounded preview, a dialog, a shadow
   *  root. */
  portalContainer?: HTMLElement | null
  /** The button element, so a dismissing card can fly into it. */
  triggerRef?: React.Ref<HTMLButtonElement>
  /** Replaces the default question mark. */
  triggerIcon?: React.ReactNode
  triggerLabel?: string
  className?: string
  contentClassName?: string
}

// Radix keeps a closing panel mounted for a CSS *animation*, never for a
// transition, so the exit needs real keyframes. They ship with the component
// instead of living in the host's Tailwind config.
const ANIMATION_CSS = `
@keyframes help-popper-in {
  from { opacity: 0; transform: translateY(4px) scale(0.97); }
  to { opacity: 1; transform: none; }
}
@keyframes help-popper-out {
  from { opacity: 1; transform: none; }
  to { opacity: 0; transform: translateY(4px) scale(0.97); }
}
[data-help-popper][data-state="open"] {
  animation: help-popper-in 140ms cubic-bezier(0.16, 1, 0.3, 1);
}
[data-help-popper][data-state="closed"] {
  animation: help-popper-out 110ms ease-in;
}
@media (prefers-reduced-motion: reduce) {
  [data-help-popper] { animation: none !important; }
}
`

/**
 * The small help button that sits in a sidebar footer: a question mark that
 * opens a compact menu, wearing a blue dot when something inside needs the
 * user, and bouncing once when a card collapses into it.
 */
export function HelpPopper({
  items = [],
  highlight,
  sections = [],
  showDot = false,
  bumpSignal,
  open,
  defaultOpen,
  onOpenChange,
  side = "top",
  align = "start",
  sideOffset = 8,
  alignOffset = -4,
  avoidCollisions = true,
  portalContainer,
  triggerRef,
  triggerIcon,
  triggerLabel = "Help",
  className,
  contentClassName,
}: HelpPopperProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(
    defaultOpen ?? false,
  )
  const isOpen = open ?? uncontrolledOpen
  const setOpen = (next: boolean) => {
    if (open === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }
  const close = () => setOpen(false)

  const [bump, setBump] = React.useState(false)
  const firstBump = React.useRef(true)
  React.useEffect(() => {
    // The initial render is not an arrival, so it must not bounce.
    if (firstBump.current) {
      firstBump.current = false
      return
    }
    setBump(true)
    const timer = setTimeout(() => setBump(false), 160)
    return () => clearTimeout(timer)
  }, [bumpSignal])

  // Mount, then transition, so the dot animates in on the frame after it exists.
  const [dotIn, setDotIn] = React.useState(false)
  React.useEffect(() => {
    if (!showDot) {
      setDotIn(false)
      return
    }
    const frame = requestAnimationFrame(() => setDotIn(true))
    return () => cancelAnimationFrame(frame)
  }, [showDot])

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setOpen}>
      <style>{ANIMATION_CSS}</style>
      <PopoverPrimitive.Trigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label={triggerLabel}
          className={cn(
            "relative flex size-7 items-center justify-center rounded-md text-muted-foreground outline-hidden hover:bg-muted/50 hover:text-foreground focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            "transition-[transform,color,background-color]",
            bump
              ? "scale-[1.17] bg-muted text-foreground duration-150 ease-[cubic-bezier(.34,1.5,.5,1)]"
              : "scale-100 duration-200 ease-out active:scale-[0.97]",
            isOpen && "bg-muted/50 text-foreground",
            className,
          )}
        >
          {triggerIcon ?? <QuestionMarkIcon />}
          {showDot && (
            <span
              aria-hidden="true"
              className={cn(
                "absolute right-0.5 top-0.5 size-2 rounded-full bg-blue-600 ring-2 ring-background transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
                dotIn ? "scale-100 opacity-100" : "scale-50 opacity-0",
              )}
            />
          )}
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal container={portalContainer ?? undefined}>
        <PopoverPrimitive.Content
          data-help-popper=""
          side={side}
          align={align}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          avoidCollisions={avoidCollisions}
          // The menu is a place to look, not a form: stealing focus on open
          // would ring the first row and read as a selection.
          onOpenAutoFocus={(event) => event.preventDefault()}
          className={cn(
            "z-50 w-[244px] origin-[var(--radix-popover-content-transform-origin)] rounded-[10px] border border-border bg-popover p-1 text-[13px] text-popover-foreground shadow-lg outline-hidden",
            contentClassName,
          )}
        >
          {highlight && (
            <>
              <button
                type="button"
                onClick={() => {
                  close()
                  highlight.onSelect?.()
                }}
                className="flex min-h-9 w-full items-center gap-2.5 rounded-md bg-blue-600/[0.08] px-2.5 py-1.5 text-left outline-hidden hover:bg-blue-600/[0.12] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:bg-white/10 dark:hover:bg-white/15"
              >
                {highlight.icon && (
                  <span className="flex size-4 shrink-0 items-center justify-center text-blue-600 dark:text-white">
                    {highlight.icon}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                  {highlight.label}
                </span>
                {highlight.meta && (
                  <span className="shrink-0 font-medium tabular-nums text-blue-600 dark:text-white">
                    {highlight.meta}
                  </span>
                )}
              </button>
              <div className="my-1 h-px bg-border" />
            </>
          )}

          {items.map((item) => (
            <HelpPopperRow key={item.label} item={item} onDone={close} />
          ))}

          {sections.map((section) => (
            <React.Fragment key={section.title}>
              <p className="px-2.5 pb-1 pt-2 text-[12px] font-medium text-muted-foreground">
                {section.title}
              </p>
              {section.items.map((item) => (
                <HelpPopperRow key={item.label} item={item} onDone={close} />
              ))}
            </React.Fragment>
          ))}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

function HelpPopperRow({
  item,
  onDone,
}: {
  item: HelpPopperItem
  onDone: () => void
}) {
  return (
    <button
      type="button"
      onClick={() => {
        onDone()
        item.onSelect?.()
      }}
      className="flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left font-medium text-foreground outline-hidden transition-colors duration-75 hover:bg-foreground/[0.08] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {item.icon && (
        <span className="flex size-4 shrink-0 items-center justify-center text-foreground">
          {item.icon}
        </span>
      )}
      <span className="flex-1 truncate">{item.label}</span>
      {item.shortcut && (
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {item.shortcut}
        </span>
      )}
      {item.external && <ExternalArrowIcon />}
    </button>
  )
}

function QuestionMarkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="size-4"
    >
      <g transform="scale(1.1) translate(-1.8, -1.8)">
        <path
          d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 16V16.01"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M12 13C12 11.3608 14 11.9319 14 10C14 8.89543 13.1046 8 12 8C11.2597 8 10.6134 8.4022 10.2676 9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}

function ExternalArrowIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="size-3 shrink-0 text-muted-foreground"
    >
      <g transform="scale(1.1)">
        <path
          d="M8 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V14.2C3 15.8802 3 16.7202 3.32698 17.362C3.6146 17.9265 4.07354 18.3854 4.63803 18.673C5.27976 19 6.11984 19 7.8 19H14.2C15.8802 19 16.7202 19 17.362 18.673C17.9265 18.3854 18.3854 17.9265 18.673 17.362C19 16.7202 19 15.8802 19 14.2V14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13 3H19M19 3V9M19 3L10 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}

export default HelpPopper

// The card leaves along a slight curve into the help button while shrinking and
// tipping, and only when it lands does the button bounce. The two halves have to
// agree on that timing, which is why they ship together.
const ARC_MS = 520
const ARC_EASING = "cubic-bezier(0.55, 0, 0.35, 1)"

/**
 * The card leaves along a slight curve and lands on the button. The path is
 * measured, not guessed: a fixed offset only works while the button stays in
 * one corner, and the moment it moves the card flies at nothing.
 */
function arcKeyframes(card: DOMRect, target: DOMRect | null): Keyframe[] {
  const dx = target
    ? target.left + target.width / 2 - (card.left + card.width / 2)
    : -card.width * 0.46
  const dy = target
    ? target.top + target.height / 2 - (card.top + card.height / 2)
    : card.height * 0.44
  const scale = target
    ? Math.max(0.06, Math.min(0.24, target.width / Math.max(1, card.width)))
    : 0.06
  // The midpoint sits off the straight line, which is what makes it an arc.
  const lift = Math.max(10, Math.abs(dy) * 0.12)
  return [
    { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1, offset: 0 },
    {
      transform: `translate(${dx * 0.4}px, ${dy * 0.4 - lift}px) scale(0.62) rotate(-3deg)`,
      opacity: 1,
      offset: 0.45,
    },
    {
      transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(-8deg)`,
      opacity: 0,
      offset: 1,
    },
  ]
}

export interface HelpPromoCardProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  /** Runs once the card has finished flying away — bump the popper here. */
  onDismissed?: () => void
  /** Fly into this element on dismiss — usually the help button. */
  targetRef?: React.RefObject<HTMLElement | null>
  dismissLabel?: string
  className?: string
}

/**
 * The card that sits above the help button and, when hidden, glides into it —
 * so the thing you dismissed has an obvious new home rather than just
 * vanishing. Pair `onDismissed` with the popper's `bumpSignal` and `showDot`.
 */
export function HelpPromoCard({
  title,
  description,
  actionLabel,
  onAction,
  onDismissed,
  targetRef,
  dismissLabel = "Hide",
  className,
}: HelpPromoCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null)
  const closing = React.useRef(false)
  const [leaving, setLeaving] = React.useState(false)

  const dismiss = () => {
    if (closing.current) return
    closing.current = true
    setLeaving(true)

    const element = cardRef.current
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches
    if (!element || reduced || typeof element.animate !== "function") {
      onDismissed?.()
      return
    }
    const animation = element.animate(
      arcKeyframes(
        element.getBoundingClientRect(),
        targetRef?.current?.getBoundingClientRect() ?? null,
      ),
      {
        duration: ARC_MS,
        easing: ARC_EASING,
        fill: "forwards",
      },
    )
    animation.onfinish = () => onDismissed?.()
    animation.oncancel = () => onDismissed?.()
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        "flex select-none flex-col gap-3 rounded-xl border border-border/70 bg-card p-3 text-[13px] shadow-[0_1px_4px_-2px_rgba(0,0,0,0.12)]",
        leaving && "pointer-events-none",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-foreground">{title}</span>
        <button
          type="button"
          onClick={dismiss}
          aria-label={dismissLabel}
          className="-mr-1 -mt-1 rounded p-1 text-muted-foreground outline-hidden transition-colors duration-75 hover:text-foreground focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M3.5 8h9" />
          </svg>
        </button>
      </div>
      <p className="leading-5 text-muted-foreground">{description}</p>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 flex items-center justify-center gap-1 rounded-md bg-muted px-3 py-2 font-medium text-foreground outline-hidden transition-[background-color,scale] duration-75 hover:bg-muted/70 active:scale-[0.97] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {actionLabel}
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 4l4 4-4 4" />
          </svg>
        </button>
      )}
    </div>
  )
}
// Class fragments Sorbet's components share. Its colours are tokens in
// src/styles.css.
//
// Three depths: raised to press (a pillow shaded from its own colour),
// flat to read, sunk to type (a well with an edge).

// Gabarito, for headings, labels, buttons, badges and menu items.
export const DISPLAY = 'font-heading'

// Squircle corners where the browser draws them; round elsewhere.
export const SQUIRCLE = '[corner-shape:squircle]'

// Keyboard focus, the same everywhere: a blueberry edge in a soft halo. A
// field's own edge turns blueberry (FIELD_FOCUS); anything else takes the
// edge hugging its outside, with the halo round that. Rings are shadows,
// so they stack with a pillow's shading.
export const FOCUS =
  'outline-none focus-visible:ring-4 focus-visible:ring-(color:--sorbet-focus-halo) focus-visible:ring-offset-[2.5px] focus-visible:ring-offset-(color:--sorbet-focus)'

// Focus on a segment inside a joined bar: the edge drawn inside it, as on
// a field, and the segment lifted so its halo shows over its neighbours.
export const FOCUS_INSIDE =
  'focus-visible:z-10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-[inset_0_0_0_2.5px_var(--sorbet-focus),0_0_0_4px_var(--sorbet-focus-halo)]!'

// The tones a pillow can take: its fill, the ink on it, the pale top it
// catches light on, the deep bottom it sits on and the tint of its shadow.
// --edge draws a rim, for the plain one that would otherwise vanish into
// the page.
export const TONE = {
  melon:
    '[--fill:var(--sorbet-melon)] [--fill-ink:var(--sorbet-melon-ink)] [--fill-hi:var(--sorbet-melon-hi)] [--fill-deep:var(--sorbet-melon-deep)] [--fill-glow:var(--sorbet-melon-glow)] [--edge:transparent]',
  butter:
    '[--fill:var(--sorbet-butter)] [--fill-ink:var(--sorbet-butter-ink)] [--fill-hi:var(--sorbet-butter-hi)] [--fill-deep:var(--sorbet-butter-deep)] [--fill-glow:var(--sorbet-butter-glow)] [--edge:transparent]',
  plain:
    '[--fill:var(--sorbet-plain)] [--fill-ink:var(--sorbet-ink)] [--fill-hi:var(--sorbet-plain-hi)] [--fill-deep:var(--sorbet-rim)] [--fill-glow:var(--sorbet-plain-glow)] [--edge:var(--sorbet-rim)]',
  danger:
    '[--fill:var(--sorbet-danger-soft)] [--fill-ink:var(--sorbet-danger)] [--fill-hi:var(--sorbet-plain-hi)] [--fill-deep:var(--sorbet-danger)] [--fill-glow:var(--sorbet-melon-glow)] [--edge:var(--sorbet-danger)]',
} as const

// A raised pillow in its tone: lit along the top, sitting on its deep
// edge, casting a shadow in its own colour. Hover lifts it a little; a
// press squashes it gently onto the table and its shadow shrinks; letting
// go springs back.
export const PILLOW = [
  'bg-(--fill) text-(--fill-ink)',
  'shadow-[inset_0_0_0_1.5px_var(--edge),inset_0_2px_1px_-0.5px_var(--fill-hi),inset_0_-5px_6px_-3px_var(--fill-deep),0_9px_16px_-9px_var(--fill-glow),0_2px_3px_-1px_var(--fill-glow)]',
  'hover:shadow-[inset_0_0_0_1.5px_var(--edge),inset_0_2px_1px_-0.5px_var(--fill-hi),inset_0_-5px_6px_-3px_var(--fill-deep),0_13px_20px_-10px_var(--fill-glow),0_3px_5px_-1px_var(--fill-glow)] motion-safe:hover:-translate-y-px',
  'active:shadow-[inset_0_0_0_1.5px_var(--edge),inset_0_1px_1px_-0.5px_var(--fill-hi),inset_0_-2px_4px_-2px_var(--fill-deep),0_2px_3px_-2px_var(--fill-glow)] motion-safe:active:translate-y-px motion-safe:active:scale-x-[1.02] motion-safe:active:scale-y-[0.95]',
  'origin-bottom motion-safe:transition-[scale,translate,box-shadow,background-color] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.34,1.5,0.5,1)] motion-safe:active:duration-75 motion-safe:active:ease-out',
].join(' ')

// The same, held down: a pillow that latched or has its menu open. It
// stays pressed in, flatter, without its shadow.
export const PILLOW_HELD =
  'shadow-[inset_0_0_0_1.5px_var(--edge),inset_0_2.5px_3px_0_var(--fill-deep),inset_0_-1px_0_0_var(--fill-hi)] translate-y-px'

// A pillow that can't be pressed has gone flat: no light, no edge, no
// shadow, in the surface tint.
export const DEFLATED =
  'disabled:bg-(--sorbet-surface-strong) disabled:text-(--sorbet-ink-muted) disabled:shadow-none disabled:translate-y-0 data-disabled:bg-(--sorbet-surface-strong) data-disabled:text-(--sorbet-ink-muted) data-disabled:shadow-none'

// A well to type into: sunk below the page in a deeper tone, shaded along
// its top, with an edge you can see. Focus brings it up to the page's
// light: it turns the canvas colour, loses its shade and takes a
// blueberry edge in a soft halo. Invalid: a danger edge.
export const FIELD = `rounded-[18px] ${SQUIRCLE} bg-(--sorbet-well) text-(--sorbet-ink) text-[17px] shadow-[inset_0_0_0_1.5px_var(--sorbet-rim),inset_0_3px_5px_-1px_var(--sorbet-well-shade)] motion-safe:transition-[background-color,box-shadow] motion-safe:duration-150`

// Focus, written out per variant so Tailwind finds every class.
export const FIELD_FOCUS =
  'focus-visible:bg-(--sorbet-canvas) focus-visible:shadow-[inset_0_0_0_2.5px_var(--sorbet-focus),0_0_0_4px_var(--sorbet-focus-halo)]'

export const FIELD_INVALID =
  'aria-invalid:bg-(--sorbet-danger-soft) aria-invalid:shadow-[inset_0_0_0_2.5px_var(--sorbet-danger),inset_0_3px_5px_-1px_var(--sorbet-well-shade)] aria-invalid:focus-visible:bg-(--sorbet-canvas) aria-invalid:focus-visible:shadow-[inset_0_0_0_2.5px_var(--sorbet-danger),0_0_0_4px_var(--sorbet-focus-halo)]'

// A disabled field has nothing to type into: no well, only a dashed edge.
export const FIELD_DISABLED =
  'disabled:cursor-not-allowed disabled:bg-transparent disabled:text-(--sorbet-ink-muted) disabled:shadow-none disabled:outline-2 disabled:outline-dashed disabled:-outline-offset-2 disabled:outline-(--sorbet-rim)/60'

// Panels that float up from a control: selects, menus, comboboxes. No
// rim: a canvas panel lifted on a tinted shadow, with a hairline to keep
// its edge on a busy page.
export const POPUP =
  'rounded-[22px] bg-(--sorbet-canvas) text-(--sorbet-ink) shadow-(--sorbet-float) ring-1 ring-(color:--sorbet-surface-strong) outline-none'

// An option in one of those panels: 48px, Gabarito; highlighted, a butter
// pillow rises under it.
export const OPTION = `relative flex min-h-12 w-full cursor-default items-center gap-3 rounded-[14px] px-3 py-2 ${DISPLAY} text-[16px] font-semibold text-(--sorbet-ink) outline-none select-none data-highlighted:bg-(--sorbet-butter) data-highlighted:text-(--sorbet-butter-ink) data-highlighted:shadow-[inset_0_2px_1px_-0.5px_var(--sorbet-butter-hi),inset_0_-4px_5px_-3px_var(--sorbet-butter-deep)] data-highlighted:[--sorbet-ink-muted:var(--sorbet-butter-ink)] data-highlighted:[--sorbet-ink:var(--sorbet-butter-ink)] data-disabled:pointer-events-none data-disabled:text-(--sorbet-ink-muted) data-disabled:opacity-70 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5`

// Popups open with a springy swell from where they're anchored.
export const POP_IN =
  'origin-(--transform-origin) motion-safe:transition-[scale,opacity] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.34,1.56,0.64,1)] data-starting-style:scale-[0.92] data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-100 data-ending-style:ease-in'

// A bead: a small raised ball in a tone (checks, dots, icons in alerts).
export const BEAD =
  'bg-(--fill) text-(--fill-ink) shadow-[inset_0_1.5px_0_0_var(--fill-hi),inset_0_-2.5px_0_0_var(--fill-deep),0_3px_6px_-3px_var(--fill-glow)]'

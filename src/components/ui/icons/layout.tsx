/**
 * Design-tool icon set — 16×16 SVG components.
 * Inspired by Figma's auto-layout panel iconography.
 * Use these in toggle_group options via "icon": "IconFlowColumn" etc.
 */

interface IconProps { size?: number }

/** Vertical stacking — items arranged in a column */
export const IconFlowColumn = ({ size = 14 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2.5" width="12" height="4.5" rx="1.5"/>
    <rect x="2" y="9"   width="12" height="4.5" rx="1.5"/>
  </svg>
)

/** Horizontal layout — items arranged in a row */
export const IconFlowRow = ({ size = 14 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="1.5" y="2" width="5.5" height="12" rx="1.5"/>
    <rect x="9"   y="2" width="5.5" height="12" rx="1.5"/>
  </svg>
)

/** Expand to fill parent — content takes full available width */
export const IconSizeFill = ({ size = 14 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    {/* Left and right boundary marks */}
    <line x1="1"  y1="3" x2="1"  y2="13"/>
    <line x1="15" y1="3" x2="15" y2="13"/>
    {/* Arrow pointing toward left boundary */}
    <path d="M6 8H1.5M4 6L2 8L4 10"/>
    {/* Arrow pointing toward right boundary */}
    <path d="M10 8H14.5M12 6L14 8L12 10"/>
  </svg>
)

/** Shrink to content — container wraps its children */
export const IconSizeHug = ({ size = 14 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    {/* Left and right boundary marks */}
    <line x1="1"  y1="3" x2="1"  y2="13"/>
    <line x1="15" y1="3" x2="15" y2="13"/>
    {/* Arrows pointing inward from boundaries toward center */}
    <path d="M1.5 8H6M3.5 6L5.5 8L3.5 10"/>
    <path d="M14.5 8H10M12.5 6L10.5 8L12.5 10"/>
  </svg>
)

/** Maximize — stretch item to fill (used in align_items: stretch) */
export const IconStretch = ({ size = 14 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg">
    <line x1="1"  y1="1"  x2="15" y2="1"/>
    <line x1="1"  y1="15" x2="15" y2="15"/>
    <rect x="4" y="3" width="8" height="10" rx="1.5"/>
  </svg>
)

/** Row layout that wraps overflowing items to next line */
export const IconFlowWrap = ({ size = 14 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect x="1.5" y="2"   width="5" height="5" rx="1.5" fill="currentColor"/>
    <rect x="8"   y="2"   width="5" height="5" rx="1.5" fill="currentColor"/>
    <rect x="1.5" y="9"   width="5" height="5" rx="1.5" fill="currentColor"/>
    <path d="M13 3.5 L13 8.5 Q13 10 11.5 10" stroke="currentColor" fill="none" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="10,8.5 11.5,10 10,11.5" stroke="currentColor" fill="none" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

/** Box with top edge highlighted — padding-top indicator */
export const IconPaddingTop = ({ size = 12 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="2"  y1="2"  x2="2"  y2="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="10" y1="2"  x2="10" y2="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="2"  y1="10" x2="10" y2="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="2"  y1="2"  x2="10" y2="2"  stroke="currentColor" strokeWidth="2"     strokeLinecap="round"/>
  </svg>
)

/** Box with right edge highlighted — padding-right indicator */
export const IconPaddingRight = ({ size = 12 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="2"  y1="2"  x2="2"  y2="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="2"  y1="2"  x2="10" y2="2"  stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="2"  y1="10" x2="10" y2="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="10" y1="2"  x2="10" y2="10" stroke="currentColor" strokeWidth="2"     strokeLinecap="round"/>
  </svg>
)

/** Box with bottom edge highlighted — padding-bottom indicator */
export const IconPaddingBottom = ({ size = 12 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="2"  y1="2"  x2="2"  y2="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="10" y1="2"  x2="10" y2="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="2"  y1="2"  x2="10" y2="2"  stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="2"  y1="10" x2="10" y2="10" stroke="currentColor" strokeWidth="2"     strokeLinecap="round"/>
  </svg>
)

/** Fill type — no background */
export const IconFillNone = ({ size = 14 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.5 2"/>
  </svg>
)

/** Fill type — solid color */
export const IconFillColor = ({ size = 14 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="12" height="12" rx="2" fill="currentColor"/>
  </svg>
)

/** Fill type — background image */
export const IconFillImage = ({ size = 14 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M3 12 L6 8.5 L8.5 10.5 L11 7 L13 12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="11" cy="5.5" r="1.25" fill="currentColor"/>
  </svg>
)

/** Fill type — gradient */
export const IconFillGradient = ({ size = 14 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="3"   height="12" rx="1" fill="currentColor"/>
    <rect x="6" y="2" width="2.5" height="12" rx="1" fill="currentColor" opacity="0.55"/>
    <rect x="9.5" y="2" width="2" height="12" rx="1" fill="currentColor" opacity="0.3"/>
    <rect x="12" y="2" width="2"  height="12" rx="1" fill="currentColor" opacity="0.1"/>
  </svg>
)

/** Box with left edge highlighted — padding-left indicator */
export const IconPaddingLeft = ({ size = 12 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="10" y1="2"  x2="10" y2="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="2"  y1="2"  x2="10" y2="2"  stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="2"  y1="10" x2="10" y2="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="2"  y1="2"  x2="2"  y2="10" stroke="currentColor" strokeWidth="2"     strokeLinecap="round"/>
  </svg>
)




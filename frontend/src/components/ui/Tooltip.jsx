// ═══════════════════════════════════════════════════════════════════════════════
// src/components/ui/Tooltip.jsx
// ═══════════════════════════════════════════════════════════════════════════════
export function Tooltip({ text, children, position = 'top' }) {
    const posMap = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full  left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full  top-1/2 -translate-y-1/2 ml-2',
    }
    return (
        <span className="relative group inline-flex">
            {children}
            <span className={`
        absolute ${posMap[position] ?? posMap.top}
        px-2 py-1 rounded-md text-xs whitespace-nowrap z-50 pointer-events-none
        bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900
        opacity-0 group-hover:opacity-100 transition-opacity duration-150
      `}>
                {text}
            </span>
        </span>
    )
}

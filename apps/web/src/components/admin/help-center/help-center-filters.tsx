import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Route } from '@/routes/admin/help-center'
import { cn } from '@/lib/shared/utils'
import { FilterSection } from '@/components/shared/filter-section'
import { FilterList } from '@/components/admin/feedback/single-select-filter-list'
import { Input } from '@/components/ui/input'
import { helpCenterQueries } from '@/lib/client/queries/help-center'
import type { HelpCenterStatusFilter } from './use-help-center-filters'

interface HelpCenterFiltersProps {
  status: HelpCenterStatusFilter
  onStatusChange: (status: HelpCenterStatusFilter) => void
  showDeleted?: boolean
  onShowDeletedChange?: (showDeleted: boolean | undefined) => void
}

const ARTICLE_STATUSES = [
  { id: 'all', name: 'All', color: undefined },
  { id: 'draft', name: 'Draft', color: '#6b7280' },
  { id: 'published', name: 'Published', color: '#22c55e' },
] as const

export function HelpCenterFiltersPanel({
  status,
  onStatusChange,
  showDeleted,
  onShowDeletedChange,
}: HelpCenterFiltersProps) {
  const { data: categories } = useQuery(helpCenterQueries.categories())
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const [jumpQuery, setJumpQuery] = useState('')

  const jumpMatches = useMemo(() => {
    if (!categories || jumpQuery.trim().length === 0) return []
    const q = jumpQuery.trim().toLowerCase()
    return categories.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8)
  }, [categories, jumpQuery])

  return (
    <div className="space-y-0">
      <FilterSection title="Status">
        <div className="space-y-1" role="listbox" aria-label="Status filter">
          {ARTICLE_STATUSES.map((item) => {
            const isSelected = status === item.id
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onStatusChange(item.id as HelpCenterStatusFilter)}
                className={cn(
                  'w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                  isSelected
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <span className="flex items-center gap-2">
                  {item.color && (
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="truncate">{item.name}</span>
                </span>
              </button>
            )
          })}
        </div>
      </FilterSection>

      <FilterSection title="Jump to">
        <Input
          placeholder="Search categories..."
          value={jumpQuery}
          onChange={(e) => setJumpQuery(e.target.value)}
          className="h-7 text-xs"
        />
        {jumpMatches.length > 0 && (
          <div className="mt-2 space-y-1">
            {jumpMatches.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setJumpQuery('')
                  void navigate({
                    to: '/admin/help-center',
                    search: { ...search, category: cat.id },
                  })
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center gap-2"
              >
                <span className="shrink-0">{cat.icon || '📁'}</span>
                <span className="truncate">{cat.name}</span>
              </button>
            ))}
          </div>
        )}
      </FilterSection>

      {/* Other Filters */}
      <FilterSection title="Other">
        <FilterList
          items={[{ id: 'deleted', name: 'Deleted items' }]}
          selectedIds={showDeleted ? ['deleted'] : []}
          onSelect={() => {
            onShowDeletedChange?.(!showDeleted || undefined)
          }}
        />
      </FilterSection>
    </div>
  )
}

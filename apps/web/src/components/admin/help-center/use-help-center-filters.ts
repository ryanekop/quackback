import { useNavigate } from '@tanstack/react-router'
import { Route } from '@/routes/admin/help-center'
import { useMemo, useCallback } from 'react'

export type HelpCenterStatusFilter = 'all' | 'draft' | 'published'

export interface HelpCenterFilters {
  status: HelpCenterStatusFilter
  category?: string
  search?: string
  showDeleted?: boolean
}

export function useHelpCenterFilters() {
  const navigate = useNavigate()
  const search = Route.useSearch()

  const filters: HelpCenterFilters = useMemo(
    () => ({
      status: search.status ?? 'all',
      category: search.category,
      search: search.search,
      showDeleted: search.deleted,
    }),
    [search.status, search.category, search.search, search.deleted]
  )

  const setFilters = useCallback(
    (updates: Partial<HelpCenterFilters>) => {
      void navigate({
        to: '/admin/help-center',
        search: {
          ...search,
          ...('status' in updates && {
            status: updates.status === 'all' ? undefined : updates.status,
          }),
          ...('category' in updates && {
            category: updates.category || undefined,
          }),
          ...('search' in updates && {
            search: updates.search || undefined,
          }),
          ...('showDeleted' in updates && {
            deleted: updates.showDeleted || undefined,
          }),
        },
        replace: true,
      })
    },
    [navigate, search]
  )

  const clearFilters = useCallback(() => {
    void navigate({
      to: '/admin/help-center',
      search: {},
      replace: true,
    })
  }, [navigate])

  const hasActiveFilters = useMemo(() => {
    return filters.status !== 'all' || !!filters.search || !!filters.showDeleted
  }, [filters.status, filters.search, filters.showDeleted])

  return {
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters,
  }
}

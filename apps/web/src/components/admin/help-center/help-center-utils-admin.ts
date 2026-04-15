interface CategoryLike {
  id: string
  parentId?: string | null
  slug: string
  name: string
}

function buildAncestorChain<T extends CategoryLike>(flat: T[], id: string): T[] {
  const byId = new Map(flat.map((c) => [c.id, c]))
  const start = byId.get(id)
  if (!start) return []
  const chain: T[] = []
  const seen = new Set<string>()
  let current: T | undefined = start
  while (current) {
    if (seen.has(current.id)) break
    seen.add(current.id)
    chain.push(current)
    if (!current.parentId) break
    current = byId.get(current.parentId)
  }
  return chain.reverse()
}

/**
 * Admin-scoped breadcrumbs. Each non-final crumb links to the admin help
 * center page with `?category=<id>` in the search params.
 *
 * The "Help Center" prefix is intentionally omitted — the user is already on
 * the admin help center page, and a standalone top-level "Help Center" entry
 * is visual noise. When the category is unknown or at the root, the returned
 * array is empty and the caller can skip rendering the breadcrumb row.
 */
export function buildAdminCategoryBreadcrumbs<T extends CategoryLike>(params: {
  allCategories: T[]
  categoryId: string
}): Array<{ label: string; href?: string }> {
  const chain = buildAncestorChain(params.allCategories, params.categoryId)
  const items: Array<{ label: string; href?: string }> = []
  chain.forEach((cat, index) => {
    const isLast = index === chain.length - 1
    if (isLast) {
      items.push({ label: cat.name })
    } else {
      items.push({ label: cat.name, href: `/admin/help-center?category=${cat.id}` })
    }
  })
  return items
}

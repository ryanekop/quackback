import { ChevronRightIcon } from '@heroicons/react/20/solid'

interface HelpCenterSubcategoryCardProps {
  category: {
    id: string
    name: string
    icon: string | null
    articleCount: number
  }
  subCategoryCount: number
  onClick: () => void
}

export function HelpCenterSubcategoryCard({
  category,
  subCategoryCount,
  onClick,
}: HelpCenterSubcategoryCardProps) {
  const parts: string[] = []
  parts.push(`${category.articleCount} article${category.articleCount === 1 ? '' : 's'}`)
  if (subCategoryCount > 0) {
    parts.push(`${subCategoryCount} sub-categor${subCategoryCount === 1 ? 'y' : 'ies'}`)
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left rounded-xl border border-border/50 bg-card p-4 hover:border-border hover:shadow-sm transition-all flex items-start gap-3"
    >
      <span className="text-2xl shrink-0">{category.icon || '📁'}</span>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
          {category.name}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{parts.join(' · ')}</div>
      </div>
      <ChevronRightIcon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
    </button>
  )
}

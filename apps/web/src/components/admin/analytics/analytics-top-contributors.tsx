import { Avatar } from '@/components/ui/avatar'

interface TopContributorsProps {
  contributors: Array<{
    principalId: string
    displayName: string | null
    avatarUrl: string | null
    posts: number
    votes: number
    comments: number
    total: number
  }>
}

export function AnalyticsTopContributors({ contributors }: TopContributorsProps) {
  if (contributors.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        No contributor activity in this period
      </div>
    )
  }

  const maxTotal = Math.max(...contributors.map((c) => c.total), 1)

  return (
    <div className="flex flex-col divide-y divide-border">
      {contributors.map((c) => {
        const barWidth = (c.total / maxTotal) * 100
        return (
          <div key={c.principalId} className="flex items-center gap-3 py-2.5">
            <Avatar src={c.avatarUrl} name={c.displayName} className="size-7 shrink-0 text-xs" />
            <span className="flex-1 truncate text-sm font-medium">
              {c.displayName ?? 'Anonymous'}
            </span>
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/50"
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <span className="w-8 text-right text-sm font-bold tabular-nums">{c.total}</span>
          </div>
        )
      })}
    </div>
  )
}

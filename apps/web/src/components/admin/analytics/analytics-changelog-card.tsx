interface ChangelogCardProps {
  topEntries: Array<{ id: string; title: string; viewCount: number }>
  totalViews: number
}

export function AnalyticsChangelogCard({ topEntries, totalViews }: ChangelogCardProps) {
  const maxViews = Math.max(...topEntries.map((e) => e.viewCount), 1)

  if (topEntries.length === 0) {
    return (
      <div className="flex h-[250px] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        No changelog entries yet
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5 py-2">
      {topEntries.map((entry) => {
        const barWidth = (entry.viewCount / maxViews) * 100
        return (
          <div key={entry.id} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm">{entry.title}</span>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                {entry.viewCount.toLocaleString()}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/40"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        )
      })}
      <p className="mt-1 text-right text-xs text-muted-foreground">
        {totalViews.toLocaleString()} total views
      </p>
    </div>
  )
}

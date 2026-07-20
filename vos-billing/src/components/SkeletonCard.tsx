export default function SkeletonCard() {
  return (
    <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          {/* Title skeleton */}
          <div className="h-3 w-20 bg-surface-700 rounded" />
          {/* Value skeleton */}
          <div className="h-7 w-16 bg-surface-700 rounded" />
          {/* Subtitle skeleton */}
          <div className="h-2.5 w-24 bg-surface-700 rounded" />
        </div>
        {/* Icon skeleton */}
        <div className="w-10 h-10 bg-surface-700 rounded-lg" />
      </div>
    </div>
  );
}

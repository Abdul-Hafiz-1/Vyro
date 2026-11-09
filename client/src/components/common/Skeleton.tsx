import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse rounded bg-vyro-surface border border-vyro-line/50 ${className}`}
    />
  );
};

export const OverviewSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Banner / Review Queue Skeleton */}
      <div className="p-5 rounded-control bg-vyro-surface border border-vyro-line space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-48 bg-vyro-line rounded" />
          <div className="h-4 w-20 bg-vyro-line rounded" />
        </div>
        <div className="space-y-3">
          <div className="h-16 w-full bg-vyro-bg border border-vyro-line rounded-control" />
          <div className="h-16 w-full bg-vyro-bg border border-vyro-line rounded-control" />
        </div>
      </div>

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-control bg-vyro-surface border border-vyro-line space-y-2">
          <div className="h-3 w-24 bg-vyro-line rounded" />
          <div className="h-6 w-16 bg-vyro-line rounded" />
        </div>
        <div className="p-4 rounded-control bg-vyro-surface border border-vyro-line space-y-2">
          <div className="h-3 w-28 bg-vyro-line rounded" />
          <div className="h-6 w-20 bg-vyro-line rounded" />
        </div>
        <div className="p-4 rounded-control bg-vyro-surface border border-vyro-line space-y-2">
          <div className="h-3 w-20 bg-vyro-line rounded" />
          <div className="h-6 w-16 bg-vyro-line rounded" />
        </div>
      </div>

      {/* Deals / Activities Table Skeleton */}
      <div className="p-5 rounded-control bg-vyro-surface border border-vyro-line space-y-3">
        <div className="h-4 w-36 bg-vyro-line rounded mb-4" />
        <div className="space-y-2">
          <div className="h-10 w-full bg-vyro-bg rounded" />
          <div className="h-10 w-full bg-vyro-bg rounded" />
          <div className="h-10 w-full bg-vyro-bg rounded" />
        </div>
      </div>
    </div>
  );
};

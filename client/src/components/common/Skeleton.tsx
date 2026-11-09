import React from 'react';

export interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: 'control' | 'surface' | 'full';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width = 'w-full',
  height = 'h-4',
  rounded = 'control',
}) => {
  const roundedClass = {
    control: 'rounded-control',
    surface: 'rounded-surface',
    full: 'rounded-full',
  }[rounded];

  return (
    <div
      className={`bg-raised animate-pulse border border-border-subtle/40 ${width} ${height} ${roundedClass} ${className}`}
    />
  );
};

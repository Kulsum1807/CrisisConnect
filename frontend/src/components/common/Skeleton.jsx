import React from 'react';

export const Skeleton = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded-md ${className}`}
      aria-hidden="true"
    />
  );
};

export const IncidentCardSkeleton = () => {
  return (
    <div className="bg-surface p-4 rounded-xl border border-gray-200 space-y-3">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex justify-between pt-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
};

export default Skeleton;

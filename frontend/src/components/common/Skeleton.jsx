import React from 'react';
import './Skeleton.css';

/**
 * Base Skeleton primitive
 */
export const Skeleton = ({ width, height, circle, className = '' }) => {
  const style = {
    width: width || '100%',
    height: height || '1rem',
  };

  return (
    <div 
      className={`skeleton-base ${circle ? 'skeleton-circle' : ''} ${className}`}
      style={style}
    />
  );
};

/**
 * Skeleton for standard text blocks
 */
export const SkeletonText = ({ lines = 3, className = '' }) => {
  return (
    <div className={`flex flex-col w-full ${className}`}>
      {[...Array(lines)].map((_, i) => (
        <Skeleton 
          key={i} 
          height="0.75rem" 
          className={`skeleton-text ${i === lines - 1 ? 'w-4/5' : ''}`} 
        />
      ))}
    </div>
  );
};

/**
 * Skeleton for headings/titles
 */
export const SkeletonTitle = ({ className = '' }) => (
  <Skeleton height="1.5rem" className={`skeleton-title ${className}`} />
);

/**
 * Skeleton for avatars/circular icons
 */
export const SkeletonCircle = ({ size = '3rem', className = '' }) => (
  <Skeleton width={size} height={size} circle className={className} />
);

/**
 * Reusable Card Skeleton matching the app's glass-card style
 */
export const SkeletonCard = ({ rows = 2, className = '' }) => (
  <div className={`glass-card p-8 border-0 ${className}`}>
    <SkeletonCircle size="3.5rem" className="mb-6" />
    <SkeletonTitle />
    <SkeletonText lines={rows} />
  </div>
);

/**
 * Skeleton for user avatars
 */
export const SkeletonAvatar = ({ size = '3rem', className = '' }) => (
  <Skeleton width={size} height={size} circle className={className} />
);

/**
 * Skeleton for a whole page section or block
 */
export const SkeletonSection = ({ className = '', height = '200px' }) => (
  <div className={`glass dark:bg-slate-900/40 rounded-[2.5rem] border-0 overflow-hidden ${className}`}>
    <Skeleton height={height} className="opacity-40" />
  </div>
);

/**
 * Skeleton Row for tables
 */
export const SkeletonTableRow = ({ columns = 4, className = '' }) => (
  <div className={`flex items-center gap-4 py-6 px-8 ${className}`}>
    {[...Array(columns)].map((_, i) => (
      <Skeleton key={i} height="0.8rem" className={i === 0 ? 'flex-[2]' : 'flex-1'} />
    ))}
  </div>
);

export default Skeleton;

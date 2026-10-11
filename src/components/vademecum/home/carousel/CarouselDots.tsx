import { memo } from 'react';

interface CarouselDotsProps {
  total: number;
  activeIndex: number;
}

const CarouselDots = ({ total, activeIndex }: CarouselDotsProps) => {
  if (total <= 1) return null;

  const count = Math.min(total, 8);
  const items = Array.from({ length: count });

  return (
    <div className="flex items-center justify-center gap-1.5">
      {items.map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === activeIndex ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  );
};

export default memo(CarouselDots);

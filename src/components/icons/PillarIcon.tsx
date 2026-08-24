import { SVGProps } from 'react';

/**
 * Pilar dórico estilizado — capitel, fuste com estrias e base.
 * Aceita as mesmas props de qualquer ícone Lucide (size, strokeWidth, className).
 */
export const PillarIcon = ({
  size = 24,
  strokeWidth = 1.4,
  className,
  ...rest
}: SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      {/* Base */}
      <path d="M3.5 21h17" />
      <path d="M5 21v-1.5h14V21" />
      <path d="M5.5 19.5h13v-1.2H5.5z" />
      {/* Fuste (coluna com estrias) */}
      <path d="M7 18.3V6.2" />
      <path d="M17 18.3V6.2" />
      <path d="M10 18.3V6.2" />
      <path d="M14 18.3V6.2" />
      {/* Capitel */}
      <path d="M5.5 6.2h13v-1.2H5.5z" />
      <path d="M5 5V3.5h14V5" />
      <path d="M3.5 3.5h17" />
    </svg>
  );
};

export default PillarIcon;

// ==========================================
// DREAM GROUP CRM - REUSABLE LOGO COMPONENT
// ==========================================
//
// PURPOSE: Single source of truth for the Dream Group logo.
//          Used in Login page, Header, Sidebar, and anywhere branding is needed.
//
// USAGE:
//   <Logo size="sm" />       → 28px  (sidebar collapsed, header)
//   <Logo size="md" />       → 40px  (sidebar expanded, header)
//   <Logo size="lg" />       → 72px  (login page)
//   <Logo size="xl" />       → 96px  (splash / large displays)
//   <Logo size={48} />       → custom px
//
// NAVIGATION: Pass navigateTo prop to make it a clickable link.
//   <Logo size="md" navigateTo="/Admin/Dashboard" />
//
import React from 'react';
import { useNavigate } from 'react-router-dom';
import favicon_logo from '@/assets/images/favicon_logo.png';

type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

const SIZE_MAP: Record<string, number> = {
  xs: 24,
  sm: 32,
  md: 44,
  lg: 72,
  xl: 96,
};

interface LogoProps {
  size?: LogoSize;
  /** If provided, clicking the logo navigates to this route */
  navigateTo?: string;
  className?: string;
  /** Show logo + text together */
  withText?: boolean;
  /** Text color for the brand name, defaults to white */
  textColor?: string;
  /** Show subtitle text */
  withSubtitle?: boolean;
}

const Logo: React.FC<LogoProps> = ({
  size = 'md',
  navigateTo,
  className = '',
  withText = false,
  textColor = 'text-white',
  withSubtitle = false,
}) => {
  const navigate = useNavigate();
  const px = typeof size === 'number' ? size : SIZE_MAP[size] || 44;
  const logoImg = favicon_logo; // ← real logo image (transparent bg) for best display on all themes/backgrounds
  const handleClick = () => {
    if (navigateTo) navigate(navigateTo);
  };

  const imgEl = (
    <img
      src={logoImg}
      alt="Dream Group Logo"
      style={{
        width: px,
        height: px,
        objectFit: 'contain',
        mixBlendMode: 'screen',   // ← removes black background on dark bg
      }}
      className="flex-shrink-0"
    />
  );

  const content = withText ? (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {imgEl}
      <div>
        <p className={`font-display font-bold leading-tight ${textColor}`}
          style={{
            fontSize: Math.max(px * 0.32, 16

            )
          }}>
          Dream Group CRM
        </p>
      </div>
    </div>
  ) : (
    <div className={className}>{imgEl}</div>
  );

  if (navigateTo) {
    return (
      <button
        onClick={handleClick}
        className="focus:outline-none cursor-pointer bg-transparent border-0 p-0"
        title="Go to Dashboard"
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        {content}
      </button>
    );
  }

  return <>{content}</>;
};

export default Logo;

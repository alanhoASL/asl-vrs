import { useSiteLogo } from '../data/siteLogo';

/** Official ASL logo. One image is shared by the public pages, sign-in and the staff portal. */
export function BrandLogo({ className = 'brand-logo' }: { className?: string }) {
  const src = useSiteLogo();
  return <img className={className} src={src} alt="ASL" />;
}

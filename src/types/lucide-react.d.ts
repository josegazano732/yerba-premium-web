declare module "lucide-react" {
  import type { SVGProps } from "react";

  export type LucideIcon = (props: SVGProps<SVGSVGElement> & { size?: number | string }) => JSX.Element;

  export const Instagram: LucideIcon;
  export const Leaf: LucideIcon;
  export const Mail: LucideIcon;
  export const MapPin: LucideIcon;
  export const Menu: LucideIcon;
  export const Music2: LucideIcon;
  export const PackageCheck: LucideIcon;
  export const Phone: LucideIcon;
  export const Search: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const ShoppingBag: LucideIcon;
  export const Sparkles: LucideIcon;
  export const Sprout: LucideIcon;
  export const Timer: LucideIcon;
  export const X: LucideIcon;
  export const Youtube: LucideIcon;
}
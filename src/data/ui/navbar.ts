// Production UI Navigation & Branding Configuration
export interface NavDropdownItem {
  name: string;
  href: string;
  description?: string;
}

export type NavIconName =
  | "heart"
  | "calendar"
  | "briefcase"
  | "shield"
  | "users";

export interface NavItem {
  name: string;
  href: string;
  badge?: string;
  icon?: NavIconName;
  isDropdown?: boolean;
  dropdownItems?: NavDropdownItem[];
}

export interface NavbarBrand {
  logoUrl: string;
}

export interface NavbarAction {
  label: string;
  href: string;
  variant: "outline" | "solid";
}

export interface NavbarConfig {
  brand: NavbarBrand;
  navItems: NavItem[];
  navItemsUser: NavItem[];
  navItemsVendor: NavItem[];
  navItemsAdmin: NavItem[];
  actions: NavbarAction[];
}

export const navbarBrand: NavbarBrand = {
  logoUrl: "https://ik.imagekit.io/muhammadsakib/Assignment_09/WedPlan%20Logo.png",
};

// Shared service categories dropdown reused across all roles
const serviceCategories: NavDropdownItem[] = [
  {
    name: "Photography & Videography",
    href: "/services?category=Photography%20%26%20Videography",
    description: "Capture timeless moments with top wedding visual artists",
  },
  {
    name: "Wedding Venues",
    href: "/services?category=Wedding%20Venues",
    description: "Breathtaking indoor & outdoor wedding locations",
  },
  {
    name: "Decoration & Florist",
    href: "/services?category=Decoration%20%26%20Florist",
    description: "Stunning floral arrangements and theme decors",
  },
  {
    name: "Catering Services",
    href: "/services?category=Catering%20Services",
    description: "Delectable dining and wedding feast experiences",
  },
  {
    name: "Makeup & Styling",
    href: "/services?category=Makeup%20%26%20Styling",
    description: "Bridal glow, luxury hair styling, and beauty artists",
  },
  {
    name: "Wedding Fashion",
    href: "/services?category=Wedding%20Fashion",
    description: "Bridal wear, grooms wear, and bespoke wedding couture",
  },
];

const commonNavStart: NavItem[] = [
  { name: "Home", href: "/" },
  {
    name: "Browse Services",
    href: "/services",
    isDropdown: true,
    dropdownItems: serviceCategories,
  },
];

// Guest navigation
export const navItems: NavItem[] = [
  ...commonNavStart,
  { name: "For Vendors", href: "/for-vendors" },
  { name: "Pricing", href: "/pricing" },
  { name: "About", href: "/about" },
];

// Role: User (Couple / Customer)
export const navItemsUser: NavItem[] = [
  ...commonNavStart,
  { name: "Saved", href: "/saved", badge: "3", icon: "heart" },
  { name: "Bookings", href: "/bookings", icon: "calendar" },
];

// Role: Vendor (Service Provider)
export const navItemsVendor: NavItem[] = [
  ...commonNavStart,
  { name: "My Services", href: "/vendor/services", icon: "briefcase" },
  { name: "Bookings", href: "/vendor/bookings", icon: "calendar" },
];

// Role: Admin (Platform Administrator)
export const navItemsAdmin: NavItem[] = [
  ...commonNavStart,
  { name: "Users", href: "/admin/users", icon: "users" },
  { name: "Admin Panel", href: "/admin", icon: "shield" },
];

export const navbarActions: NavbarAction[] = [
  { label: "Sign In", href: "/login", variant: "outline" },
  { label: "Sign Up", href: "/sign-up", variant: "solid" },
];

export const navbarConfig: NavbarConfig = {
  brand: navbarBrand,
  navItems,
  navItemsUser,
  navItemsVendor,
  navItemsAdmin,
  actions: navbarActions,
};

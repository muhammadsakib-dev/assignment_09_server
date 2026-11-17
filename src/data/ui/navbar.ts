// Fake Data

// Type for navigation items
export interface NavItem {
  name: string;
  href: string;
}

// Navigation items for the application
export const navItems: NavItem[] = [
  {
    name: "Home",
    href: "/",
  },
  {
    name: "Health",
    href: "/health",
  },
];

// Navigation items for admin users
export const navItemsAdmin: NavItem[] = [
  {
    name: "Home",
    href: "/",
  },
  { 
    name: "Health",
    href: "/health",
  },
  {
    name: "Admin",
    href: "/admin",
  },
];
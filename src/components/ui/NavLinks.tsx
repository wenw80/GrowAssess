'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const baseNavItems = [
  { href: '/tests', label: 'Tests' },
  { href: '/candidates', label: 'Candidates' },
  { href: '/reports', label: 'Reports' },
  { href: '/settings', label: 'Settings' },
];

const adminNavItems = [
  { href: '/users', label: 'Users' },
];

export default function NavLinks() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if current user is admin
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user?.role === 'admin') {
          setIsAdmin(true);
        }
      })
      .catch(() => {});
  }, []);

  const navItems = isAdmin ? [...baseNavItems, ...adminNavItems] : baseNavItems;

  return (
    <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
              isActive
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

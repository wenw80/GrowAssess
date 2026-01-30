'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const baseNavItems = [
  { href: '/tests', label: 'Tests' },
  { href: '/questions', label: 'Questions' },
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
    <ul className="menu menu-horizontal hidden sm:flex sm:ml-8">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={isActive ? 'active' : ''}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

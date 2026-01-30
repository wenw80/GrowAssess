'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const baseNavLinks = [
  { href: '/tests', label: 'Tests' },
  { href: '/candidates', label: 'Candidates' },
  { href: '/reports', label: 'Reports' },
  { href: '/settings', label: 'Settings' },
];

const adminNavLinks = [
  { href: '/users', label: 'Users' },
];

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();

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

  const navLinks = isAdmin ? [...baseNavLinks, ...adminNavLinks] : baseNavLinks;

  return (
    <div className="sm:hidden">
      <div className="drawer">
        <input
          id="mobile-drawer"
          type="checkbox"
          className="drawer-toggle"
          checked={isOpen}
          onChange={() => setIsOpen(!isOpen)}
        />
        <div className="drawer-content">
          {/* Hamburger button */}
          <label
            htmlFor="mobile-drawer"
            className="btn btn-ghost btn-circle"
            aria-label="Open main menu"
          >
            {isOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </label>
        </div>
        <div className="drawer-side z-50">
          <label htmlFor="mobile-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
          <ul className="menu bg-base-100 min-h-full w-64 p-4">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={isActive ? 'active' : ''}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

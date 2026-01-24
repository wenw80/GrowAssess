import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Link from 'next/link';
import LogoutButton from '@/components/ui/LogoutButton';
import MobileNav from '@/components/ui/MobileNav';
import NavLinks from '@/components/ui/NavLinks';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 relative">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Mobile hamburger menu */}
              <MobileNav />

              {/* Logo */}
              <div className="flex-shrink-0 flex items-center ml-2 sm:ml-0">
                <Link href="/tests" className="text-xl font-bold text-blue-600">
                  GrowAssess
                </Link>
              </div>

              {/* Desktop navigation */}
              <NavLinks />
            </div>

            <div className="flex items-center">
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="w-full py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

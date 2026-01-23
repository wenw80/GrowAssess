import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Link from 'next/link';
import LogoutButton from '@/components/ui/LogoutButton';
import MobileNav from '@/components/ui/MobileNav';

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
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                <NavLink href="/tests">Tests</NavLink>
                <NavLink href="/candidates">Candidates</NavLink>
                <NavLink href="/reports">Reports</NavLink>
              </div>
            </div>

            <div className="flex items-center">
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-screen-2xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
    >
      {children}
    </Link>
  );
}

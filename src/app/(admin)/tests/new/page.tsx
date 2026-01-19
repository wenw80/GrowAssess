import Link from 'next/link';
import TestForm from '@/components/tests/TestForm';

export default function NewTestPage() {
  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6">
        <Link href="/tests" className="text-blue-600 hover:underline text-sm">
          ← Back to Tests
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Create New Test</h1>
        <p className="text-gray-500 mt-1">Build a cognitive test with multiple question types</p>
      </div>

      <TestForm />
    </div>
  );
}

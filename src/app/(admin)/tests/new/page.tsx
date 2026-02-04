import Link from 'next/link';
import TestForm from '@/components/tests/TestForm';

export default function NewTestPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-6">
        <Link href="/tests" className="text-primary hover:underline text-sm">
          ← Back to Tests
        </Link>
        <h1 className="text-2xl font-bold text-foreground mt-2">Create New Test</h1>
        <p className="text-muted-foreground mt-1">Build a cognitive test with multiple question types</p>
      </div>

      <TestForm />
    </div>
  );
}

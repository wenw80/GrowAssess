import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import TestForm from '@/components/tests/TestForm';

export default async function EditTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!test) {
    notFound();
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6">
        <Link href="/tests" className="text-blue-600 hover:underline text-sm">
          ← Back to Tests
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Edit Test</h1>
        <p className="text-gray-500 mt-1">Update test details and questions</p>
      </div>

      <TestForm initialData={test} />
    </div>
  );
}

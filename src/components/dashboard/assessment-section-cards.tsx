'use client';

import { useEffect, useState } from 'react';
import { TrendingDownIcon, TrendingUpIcon, ClipboardCheck, Users, CheckCircle, BarChart3 } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';

interface DashboardStats {
  totalTests: number;
  totalCandidates: number;
  completedAssessments: number;
  averageScore: number;
  testsChange: number;
  candidatesChange: number;
  completedChange: number;
  scoreChange: number;
}

export function AssessmentSectionCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [testsRes, candidatesRes, assignmentsRes] = await Promise.all([
          fetch('/api/tests?filter=all'),
          fetch('/api/candidates'),
          fetch('/api/assignments?status=completed'),
        ]);

        const tests = await testsRes.json();
        const candidates = await candidatesRes.json();
        const assignments = await assignmentsRes.json();

        // Calculate stats
        const totalTests = Array.isArray(tests) ? tests.length : 0;
        const totalCandidates = Array.isArray(candidates) ? candidates.length : 0;
        const completedAssignments = Array.isArray(assignments) ? assignments.length : 0;

        // Calculate average score from completed assignments
        let avgScore = 0;
        if (Array.isArray(assignments) && assignments.length > 0) {
          const totalScore = assignments.reduce((sum: number, a: { scorePercentage?: number }) =>
            sum + (a.scorePercentage || 0), 0);
          avgScore = totalScore / assignments.length;
        }

        setStats({
          totalTests,
          totalCandidates,
          completedAssessments: completedAssignments,
          averageScore: Math.round(avgScore * 10) / 10,
          testsChange: 12.5, // Placeholder - would calculate from historical data
          candidatesChange: 8.2,
          completedChange: 15.3,
          scoreChange: 2.1,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="*:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 grid grid-cols-1 gap-4 px-4 lg:px-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="@container/card animate-pulse">
            <CardHeader className="relative">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-8 w-16 bg-muted rounded mt-2" />
            </CardHeader>
            <CardFooter>
              <div className="h-4 w-32 bg-muted rounded" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="*:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card lg:px-6">
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription className="flex items-center gap-2">
            <ClipboardCheck className="size-4" />
            Total Tests
          </CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {stats?.totalTests || 0}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
              <TrendingUpIcon className="size-3" />
              +{stats?.testsChange}%
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Active assessments <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Available for candidates
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription className="flex items-center gap-2">
            <Users className="size-4" />
            Total Candidates
          </CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {stats?.totalCandidates || 0}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
              <TrendingUpIcon className="size-3" />
              +{stats?.candidatesChange}%
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Growing candidate pool <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Registered in the system
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription className="flex items-center gap-2">
            <CheckCircle className="size-4" />
            Completed
          </CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {stats?.completedAssessments || 0}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
              <TrendingUpIcon className="size-3" />
              +{stats?.completedChange}%
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Tests completed <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Assessments finished
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription className="flex items-center gap-2">
            <BarChart3 className="size-4" />
            Average Score
          </CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {stats?.averageScore || 0}%
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
              {(stats?.scoreChange || 0) >= 0 ? (
                <TrendingUpIcon className="size-3" />
              ) : (
                <TrendingDownIcon className="size-3" />
              )}
              {(stats?.scoreChange || 0) >= 0 ? '+' : ''}{stats?.scoreChange}%
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Performance tracking <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Across all assessments
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

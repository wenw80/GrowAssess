'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { formatDate } from '@/lib/utils';

interface CandidateResponse {
  candidateId: string;
  candidateName: string;
  answer: string | null;
  score: number;
  maxScore: number;
  isCorrect: boolean | null;
  graderNotes: string | null;
  timeTakenSeconds: number | null;
}

interface QuestionAnalytic {
  question: {
    id: string;
    type: string;
    content: string;
    points: number;
    options: string | null;
    correctAnswer: string | null;
  };
  stats: {
    totalResponses: number;
    answeredCount: number;
    averageScore: number;
    maxScore: number;
    minScore: number;
    averagePercentage: number;
    correctCount: number;
    incorrectCount: number;
    averageTimeSeconds: number;
  };
  candidateResponses: CandidateResponse[];
}

interface CandidateResult {
  assignmentId: string;
  candidate: {
    id: string;
    name: string;
    email: string;
    position: string | null;
  };
  completedAt: string | null;
  score: {
    earned: number;
    total: number;
    percentage: number;
  };
}

interface TestAnalyticsData {
  test: {
    id: string;
    title: string;
    description: string | null;
    tags: string[];
    durationMinutes: number | null;
    createdBy: {
      name: string;
      email: string;
    };
    createdAt: string;
  };
  totalCandidates: number;
  candidateResults: CandidateResult[];
  questionAnalytics: QuestionAnalytic[];
  overallStats: {
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    completionRate: number;
    totalPoints: number;
  };
}

interface TestAnalyticsProps {
  testId: string;
}

export default function TestAnalytics({ testId }: TestAnalyticsProps) {
  const [data, setData] = useState<TestAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAnalytics();
  }, [testId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/test-analytics/${testId}`);
      const analyticsData = await res.json();
      setData(analyticsData);
    } catch (error) {
      console.error('Error fetching test analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  const getOptionText = (options: string | null, answerId: string | null) => {
    if (!options || !answerId) return answerId || '-';
    try {
      const parsed = JSON.parse(options);
      const option = parsed.find((o: { id: string; text: string }) => o.id === answerId);
      return option?.text || answerId;
    } catch {
      return answerId;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="text-center py-12">
        <p className="text-muted-foreground">Failed to load test analytics</p>
      </Card>
    );
  }

  if (data.totalCandidates === 0) {
    return (
      <Card className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-foreground">No completed assessments yet</h3>
        <p className="mt-2 text-muted-foreground">
          This test hasn't been completed by any candidates yet.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Test Header */}
      <Card className="flex flex-col gap-6 overflow-hidden rounded-xl py-4">
        <div className="px-4 border-b border-border pb-4">
          <h2 className="text-2xl font-bold text-foreground">{data.test.title}</h2>
          {data.test.description && (
            <p className="text-muted-foreground mt-2">{data.test.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3">
            {data.test.tags && data.test.tags.length > 0 && (
              <div className="flex gap-2">
                {data.test.tags.map((tag) => (
                  <Badge key={tag} variant="default">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            {data.test.durationMinutes && (
              <span className="text-sm text-muted-foreground">
                Duration: {data.test.durationMinutes} min
              </span>
            )}
          </div>
        </div>

        {/* Overall Statistics */}
        <div className="px-4 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-primary font-medium">Total Candidates</p>
            <p className="text-2xl font-bold text-foreground">{data.totalCandidates}</p>
          </div>
          <div className="p-4 bg-green-500/10 rounded-lg">
            <p className="text-sm text-green-700 font-medium">Average Score</p>
            <p className="text-2xl font-bold text-foreground">{data.overallStats.averageScore}%</p>
          </div>
          <div className="p-4 bg-purple-500/10 rounded-lg">
            <p className="text-sm text-purple-700 font-medium">Highest Score</p>
            <p className="text-2xl font-bold text-foreground">{data.overallStats.highestScore}%</p>
          </div>
          <div className="p-4 bg-amber-500/10 rounded-lg">
            <p className="text-sm text-amber-700 font-medium">Lowest Score</p>
            <p className="text-2xl font-bold text-foreground">{data.overallStats.lowestScore}%</p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground font-medium">Completion Rate</p>
            <p className="text-2xl font-bold text-foreground">{data.overallStats.completionRate}%</p>
          </div>
        </div>
      </Card>

      {/* Candidate Rankings */}
      <Card className="flex flex-col gap-4 overflow-hidden rounded-xl py-4">
        <div className="px-4">
          <h3 className="text-base font-medium leading-snug">Candidate Performance</h3>
          <p className="text-sm text-muted-foreground mt-1">Rankings based on test scores</p>
        </div>
        <div className="px-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Candidate</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.candidateResults.map((result, index) => (
                <TableRow key={result.assignmentId}>
                  <TableCell>
                    <div className="flex items-center">
                      {index === 0 && <span className="mr-2">🥇</span>}
                      {index === 1 && <span className="mr-2">🥈</span>}
                      {index === 2 && <span className="mr-2">🥉</span>}
                      <span className="font-medium">#{index + 1}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{result.candidate.name}</TableCell>
                  <TableCell className="text-muted-foreground">{result.candidate.email}</TableCell>
                  <TableCell className="text-muted-foreground">{result.candidate.position || '-'}</TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {result.score.earned}/{result.score.total}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        result.score.percentage >= 80
                          ? 'success'
                          : result.score.percentage >= 60
                          ? 'warning'
                          : 'danger'
                      }
                    >
                      {result.score.percentage}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {result.completedAt ? formatDate(result.completedAt) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Question-by-Question Analysis */}
      <Card className="flex flex-col gap-4 overflow-hidden rounded-xl py-4">
        <div className="px-4">
          <h3 className="text-base font-medium leading-snug">Question Analysis</h3>
          <p className="text-sm text-muted-foreground mt-1">Detailed breakdown of each question&apos;s performance</p>
        </div>
        <div className="px-4 space-y-3">
        {data.questionAnalytics.map((qa, index) => {
          const isExpanded = expandedQuestions.has(qa.question.id);

          return (
            <div key={qa.question.id} className="rounded-lg border p-3 bg-muted/30">
              {/* Question Header */}
              <div
                className="cursor-pointer"
                onClick={() => toggleQuestion(qa.question.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Question {index + 1}
                      </span>
                      <Badge variant="default">{qa.question.type}</Badge>
                      <span className="text-sm text-muted-foreground">{qa.question.points} pts</span>
                    </div>
                    <p className="text-foreground font-medium">{qa.question.content}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    {isExpanded ? '▼' : '▶'}
                  </Button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4">
                  <div className="p-3 bg-primary/10 rounded text-center">
                    <p className="text-xs text-primary font-medium">Avg Score</p>
                    <p className="text-lg font-bold text-foreground">{qa.stats.averageScore}</p>
                    <p className="text-xs text-primary">/ {qa.question.points}</p>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded text-center">
                    <p className="text-xs text-green-700 font-medium">Avg %</p>
                    <p className="text-lg font-bold text-foreground">{qa.stats.averagePercentage}%</p>
                  </div>
                  <div className="p-3 bg-purple-500/10 rounded text-center">
                    <p className="text-xs text-purple-700 font-medium">Max</p>
                    <p className="text-lg font-bold text-foreground">{qa.stats.maxScore}</p>
                  </div>
                  <div className="p-3 bg-amber-500/10 rounded text-center">
                    <p className="text-xs text-amber-700 font-medium">Min</p>
                    <p className="text-lg font-bold text-foreground">{qa.stats.minScore}</p>
                  </div>
                  {qa.question.type === 'mcq' && (
                    <>
                      <div className="p-3 bg-green-500/20 rounded text-center">
                        <p className="text-xs text-green-700 font-medium">Correct</p>
                        <p className="text-lg font-bold text-foreground">{qa.stats.correctCount}</p>
                      </div>
                      <div className="p-3 bg-destructive/10 rounded text-center">
                        <p className="text-xs text-destructive font-medium">Incorrect</p>
                        <p className="text-lg font-bold text-foreground">{qa.stats.incorrectCount}</p>
                      </div>
                    </>
                  )}
                  {qa.stats.averageTimeSeconds > 0 && (
                    <div className="p-3 bg-muted rounded text-center">
                      <p className="text-xs text-muted-foreground font-medium">Avg Time</p>
                      <p className="text-lg font-bold text-foreground">{qa.stats.averageTimeSeconds}s</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-border mt-4 pt-4">
                  {qa.question.type === 'mcq' && qa.question.correctAnswer && (
                    <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded">
                      <p className="text-sm font-medium text-green-700 mb-1">Correct Answer:</p>
                      <p className="text-sm text-foreground">
                        {getOptionText(qa.question.options, qa.question.correctAnswer)}
                      </p>
                    </div>
                  )}

                  <h4 className="text-sm font-semibold text-foreground mb-3">
                    Individual Responses ({qa.candidateResponses.length} candidates)
                  </h4>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Candidate</TableHead>
                          <TableHead>Answer</TableHead>
                          <TableHead>Score</TableHead>
                          {qa.question.type === 'mcq' && <TableHead>Result</TableHead>}
                          {qa.candidateResponses.some((r) => r.timeTakenSeconds) && (
                            <TableHead>Time</TableHead>
                          )}
                          {qa.candidateResponses.some((r) => r.graderNotes) && (
                            <TableHead>Notes</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {qa.candidateResponses.map((response) => (
                          <TableRow key={response.candidateId}>
                            <TableCell className="font-medium">{response.candidateName}</TableCell>
                            <TableCell className="max-w-md">
                              {response.answer ? (
                                qa.question.type === 'mcq' ? (
                                  getOptionText(qa.question.options, response.answer)
                                ) : (
                                  <div className="text-sm truncate" title={response.answer}>
                                    {response.answer}
                                  </div>
                                )
                              ) : (
                                <span className="text-muted-foreground">No answer</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">
                                {response.score}/{response.maxScore}
                              </span>
                            </TableCell>
                            {qa.question.type === 'mcq' && (
                              <TableCell>
                                {response.isCorrect !== null && (
                                  <Badge variant={response.isCorrect ? 'success' : 'danger'}>
                                    {response.isCorrect ? 'Correct' : 'Incorrect'}
                                  </Badge>
                                )}
                              </TableCell>
                            )}
                            {qa.candidateResponses.some((r) => r.timeTakenSeconds) && (
                              <TableCell>
                                {response.timeTakenSeconds ? `${response.timeTakenSeconds}s` : '-'}
                              </TableCell>
                            )}
                            {qa.candidateResponses.some((r) => r.graderNotes) && (
                              <TableCell className="max-w-xs">
                                {response.graderNotes ? (
                                  <div className="text-xs text-muted-foreground truncate" title={response.graderNotes}>
                                    {response.graderNotes}
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        </div>
      </Card>
    </div>
  );
}

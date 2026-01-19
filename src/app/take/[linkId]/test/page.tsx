'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Textarea from '@/components/ui/Textarea';
import { formatDuration } from '@/lib/utils';

interface MCQOption {
  id: string;
  text: string;
}

interface Question {
  id: string;
  type: string;
  content: string;
  options: string | null;
  timeLimitSeconds: number | null;
  points: number;
  order: number;
}

interface Response {
  questionId: string;
  answer: string | null;
}

interface Assignment {
  id: string;
  status: string;
  test: {
    title: string;
    durationMinutes: number | null;
    questions: Question[];
  };
  responses: Response[];
}

export default function TestTakingPage({
  params,
}: {
  params: Promise<{ linkId: string }>;
}) {
  const { linkId } = use(params);
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAssignment();
  }, [linkId]);

  const fetchAssignment = async () => {
    try {
      const res = await fetch(`/api/assignments/link/${linkId}`);
      if (res.ok) {
        const data = await res.json();

        if (data.status === 'completed') {
          router.push(`/take/${linkId}`);
          return;
        }

        if (data.status === 'not_started') {
          router.push(`/take/${linkId}`);
          return;
        }

        setAssignment(data);

        // Load existing answers
        const existingAnswers: Record<string, string> = {};
        data.responses.forEach((r: Response) => {
          if (r.answer) {
            existingAnswers[r.questionId] = r.answer;
          }
        });
        setAnswers(existingAnswers);

        // Set timer for timed question
        const currentQuestion = data.test.questions[0];
        if (currentQuestion?.timeLimitSeconds) {
          setTimeLeft(currentQuestion.timeLimitSeconds);
        }
      } else {
        router.push(`/take/${linkId}`);
      }
    } catch {
      router.push(`/take/${linkId}`);
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = assignment?.test.questions[currentIndex];
  const totalQuestions = assignment?.test.questions.length || 0;

  const saveAnswer = useCallback(
    async (questionId: string, answer: string) => {
      if (!assignment) return;

      setSaving(true);
      const timeTaken = Math.round((Date.now() - questionStartTime) / 1000);

      try {
        await fetch('/api/responses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignmentId: assignment.id,
            questionId,
            answer,
            timeTakenSeconds: timeTaken,
          }),
        });
      } catch (error) {
        console.error('Error saving answer:', error);
      } finally {
        setSaving(false);
      }
    },
    [assignment, questionStartTime]
  );

  // Timer effect for timed questions
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          // Auto-advance when time runs out
          if (currentQuestion) {
            saveAnswer(currentQuestion.id, answers[currentQuestion.id] || '');
            goToNext();
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, currentQuestion, answers, saveAnswer]);

  const goToNext = () => {
    if (currentIndex < totalQuestions - 1) {
      const nextQuestion = assignment?.test.questions[currentIndex + 1];
      setCurrentIndex(currentIndex + 1);
      setQuestionStartTime(Date.now());
      if (nextQuestion?.timeLimitSeconds) {
        setTimeLeft(nextQuestion.timeLimitSeconds);
      } else {
        setTimeLeft(null);
      }
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevQuestion = assignment?.test.questions[currentIndex - 1];
      setCurrentIndex(currentIndex - 1);
      setQuestionStartTime(Date.now());
      if (prevQuestion?.timeLimitSeconds) {
        setTimeLeft(prevQuestion.timeLimitSeconds);
      } else {
        setTimeLeft(null);
      }
    }
  };

  const handleAnswer = (answer: string) => {
    if (!currentQuestion) return;

    setAnswers({ ...answers, [currentQuestion.id]: answer });

    // Auto-save for MCQ
    if (currentQuestion.type === 'mcq') {
      saveAnswer(currentQuestion.id, answer);
    }
  };

  const handleNext = async () => {
    if (!currentQuestion) return;

    // Save current answer before moving
    await saveAnswer(currentQuestion.id, answers[currentQuestion.id] || '');
    goToNext();
  };

  const handleSubmit = async () => {
    if (!assignment || !currentQuestion) return;

    if (!confirm('Are you sure you want to submit your test? You cannot change your answers after submission.')) {
      return;
    }

    setSubmitting(true);
    try {
      // Save current answer
      await saveAnswer(currentQuestion.id, answers[currentQuestion.id] || '');

      // Mark test as completed
      await fetch(`/api/assignments/link/${linkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });

      router.push(`/take/${linkId}`);
    } catch (error) {
      console.error('Error submitting test:', error);
      alert('Failed to submit test. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !assignment || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const options: MCQOption[] = currentQuestion.options
    ? JSON.parse(currentQuestion.options)
    : [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">{assignment.test.title}</h1>
          <div className="flex items-center gap-4">
            {saving && (
              <span className="text-sm text-gray-500">Saving...</span>
            )}
            {timeLeft !== null && (
              <div
                className={`px-4 py-2 rounded-lg font-mono font-bold ${
                  timeLeft <= 10 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}
              >
                {formatDuration(timeLeft)}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Question {currentIndex + 1} of {totalQuestions}</span>
            <span>{Math.round(((currentIndex + 1) / totalQuestions) * 100)}% complete</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className="h-2 bg-blue-600 rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <Card className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">
              {currentQuestion.type === 'mcq'
                ? 'Multiple Choice'
                : currentQuestion.type === 'timed'
                ? 'Timed Task'
                : 'Free Response'}
            </span>
            <span className="text-sm text-gray-500">{currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}</span>
          </div>

          <p className="text-lg text-gray-900 mb-6 whitespace-pre-wrap">
            {currentQuestion.content}
          </p>

          {currentQuestion.type === 'mcq' && (
            <div className="space-y-3">
              {options.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    answers[currentQuestion.id] === option.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    checked={answers[currentQuestion.id] === option.id}
                    onChange={() => handleAnswer(option.id)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                      answers[currentQuestion.id] === option.id
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {answers[currentQuestion.id] === option.id && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="text-gray-900">{option.text}</span>
                </label>
              ))}
            </div>
          )}

          {(currentQuestion.type === 'freetext' || currentQuestion.type === 'timed') && (
            <Textarea
              rows={6}
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full"
            />
          )}
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            onClick={goToPrevious}
            disabled={currentIndex === 0}
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {/* Question dots */}
            {assignment.test.questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => {
                  saveAnswer(currentQuestion.id, answers[currentQuestion.id] || '');
                  setCurrentIndex(i);
                  setQuestionStartTime(Date.now());
                  const targetQuestion = assignment.test.questions[i];
                  if (targetQuestion?.timeLimitSeconds) {
                    setTimeLeft(targetQuestion.timeLimitSeconds);
                  } else {
                    setTimeLeft(null);
                  }
                }}
                className={`w-3 h-3 rounded-full transition-colors ${
                  i === currentIndex
                    ? 'bg-blue-600'
                    : answers[q.id]
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {currentIndex === totalQuestions - 1 ? (
            <Button onClick={handleSubmit} loading={submitting}>
              Submit Test
            </Button>
          ) : (
            <Button onClick={handleNext}>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
}

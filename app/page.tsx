'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, COURSE_ID, type Question, type Answer } from '@/lib/supabase'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function Home() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [name, setName] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [upvoting, setUpvoting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, Answer[]>>({})
  const [answeringId, setAnsweringId] = useState<string | null>(null)
  const [answerName, setAnswerName] = useState('')
  const [answerText, setAnswerText] = useState('')
  const [submittingAnswer, setSubmittingAnswer] = useState(false)
  const [answerError, setAnswerError] = useState<string | null>(null)
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({})

  const fetchQuestions = useCallback(async () => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('course_id', COURSE_ID)
      .order('upvotes', { ascending: false })
    if (!error && data) setQuestions(data)
  }, [])

  const fetchAnswers = useCallback(async (questionIds: string[]) => {
    if (questionIds.length === 0) return
    const { data, error } = await supabase
      .from('answers')
      .select('*')
      .in('question_id', questionIds)
      .order('created_at', { ascending: true })
    if (!error && data) {
      const grouped: Record<string, Answer[]> = {}
      for (const a of data) {
        if (!grouped[a.question_id]) grouped[a.question_id] = []
        grouped[a.question_id].push(a)
      }
      setAnswers(grouped)
    }
  }, [])

  useEffect(() => {
    fetchQuestions().then(() => {})
  }, [fetchQuestions])

  useEffect(() => {
    if (questions.length > 0) {
      fetchAnswers(questions.map((q) => q.id))
    }
  }, [questions, fetchAnswers])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !questionText.trim()) return
    setSubmitting(true)
    setError(null)
    const { error } = await supabase.from('questions').insert({
      name: name.trim(),
      question_text: questionText.trim(),
      course_id: COURSE_ID,
      upvotes: 0,
    })
    if (error) {
      setError(error.message)
    } else {
      setName('')
      setQuestionText('')
      await fetchQuestions()
    }
    setSubmitting(false)
  }

  async function handleUpvote(question: Question) {
    if (upvoting) return
    setUpvoting(question.id)
    const newCount = question.upvotes + 1
    // Optimistic update
    setQuestions((prev) =>
      [...prev.map((q) =>
        q.id === question.id ? { ...q, upvotes: newCount } : q
      )].sort((a, b) => b.upvotes - a.upvotes)
    )
    await supabase
      .from('questions')
      .update({ upvotes: newCount })
      .eq('id', question.id)
    setUpvoting(null)
  }

  async function handleSubmitAnswer(questionId: string) {
    if (!answerName.trim() || !answerText.trim()) return
    setSubmittingAnswer(true)
    setAnswerError(null)
    const { error } = await supabase.from('answers').insert({
      question_id: questionId,
      name: answerName.trim(),
      answer_text: answerText.trim(),
    })
    if (error) {
      setAnswerError(error.message)
    } else {
      setAnswerName('')
      setAnswerText('')
      setAnsweringId(null)
      await fetchAnswers(questions.map((q) => q.id))
    }
    setSubmittingAnswer(false)
  }

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '48px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#f0f0f2' }}>
          Ask the Cohort
        </h1>
        <p style={{ margin: '8px 0 0', color: '#8b8b9a', fontSize: 15 }}>
          Ask a question. The most upvoted rise to the top.
        </p>
      </div>

      {/* Submit Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#141417',
          border: '1px solid #2a2a32',
          borderRadius: 12,
          padding: 24,
          marginBottom: 36,
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#8b8b9a', marginBottom: 6 }}>
            Your name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex"
            required
            style={{
              width: '100%',
              background: '#0d0d0f',
              border: '1px solid #2a2a32',
              borderRadius: 8,
              padding: '10px 14px',
              color: '#f0f0f2',
              fontSize: 15,
              outline: 'none',
            }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#8b8b9a', marginBottom: 6 }}>
            Your question
          </label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="What's on your mind?"
            required
            rows={3}
            style={{
              width: '100%',
              background: '#0d0d0f',
              border: '1px solid #2a2a32',
              borderRadius: 8,
              padding: '10px 14px',
              color: '#f0f0f2',
              fontSize: 15,
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>
        {error && (
          <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          style={{
            background: submitting ? '#3d3775' : '#7c6ff7',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            fontSize: 15,
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {submitting ? 'Submitting…' : 'Submit Question'}
        </button>
      </form>

      {/* Question Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {questions.length === 0 ? (
          <p style={{ color: '#8b8b9a', textAlign: 'center', padding: '40px 0' }}>
            No questions yet. Be the first!
          </p>
        ) : (
          questions.map((q) => (
            <div
              key={q.id}
              style={{
                background: '#141417',
                border: '1px solid #2a2a32',
                borderRadius: 12,
                padding: '18px 20px',
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
              }}
            >
              {/* Upvote button */}
              <button
                onClick={() => handleUpvote(q)}
                disabled={upvoting === q.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  background: 'transparent',
                  border: '1px solid #2a2a32',
                  borderRadius: 8,
                  padding: '8px 12px',
                  cursor: upvoting === q.id ? 'not-allowed' : 'pointer',
                  color: upvoting === q.id ? '#5a5a6a' : '#8b8b9a',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                  minWidth: 48,
                }}
                onMouseEnter={(e) => {
                  if (upvoting !== q.id) {
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#7c6ff7'
                    ;(e.currentTarget as HTMLButtonElement).style.color = '#7c6ff7'
                  }
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a32'
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#8b8b9a'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2L12 9H2L7 2Z" fill="currentColor" />
                </svg>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#f0f0f2' }}>
                  {q.upvotes}
                </span>
              </button>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 8px', fontSize: 16, color: '#f0f0f2', lineHeight: 1.5 }}>
                  {q.question_text}
                </p>
                <p style={{ margin: 0, fontSize: 13, color: '#8b8b9a' }}>
                  <span style={{ color: '#a0a0b0' }}>Asked by {q.name}</span>
                  {' · '}
                  {timeAgo(q.created_at)}
                </p>

                {/* Answer / Answers controls */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingTop: 10 }}>
                  <button
                    onClick={() => {
                      setAnsweringId(answeringId === q.id ? null : q.id)
                      setAnswerError(null)
                    }}
                    style={{
                      background: '#7c6ff7',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '1px 6px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                  >
                    {answeringId === q.id ? 'Collapse Answer' : 'Answer'}
                  </button>

                  {(answers[q.id]?.length ?? 0) > 0 && (
                    <button
                      onClick={() =>
                        setExpandedAnswers((prev) => ({
                          ...prev,
                          [q.id]: !prev[q.id],
                        }))
                      }
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#7c6ff7',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '6px 0',
                      }}
                    >
                      {expandedAnswers[q.id]
                        ? `Hide ${answers[q.id].length} Existing Answer${answers[q.id].length === 1 ? '' : 's'}`
                        : `${answers[q.id].length} Existing Answer${answers[q.id].length === 1 ? '' : 's'}`}
                    </button>
                  )}
                </div>

                {/* Answer form */}
                {answeringId === q.id && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 16,
                      background: '#0d0d0f',
                      border: '1px solid #2a2a32',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ marginBottom: 12 }}>
                      <input
                        type="text"
                        value={answerName}
                        onChange={(e) => setAnswerName(e.target.value)}
                        placeholder="Your name"
                        style={{
                          width: '100%',
                          background: '#141417',
                          border: '1px solid #2a2a32',
                          borderRadius: 8,
                          padding: '8px 12px',
                          color: '#f0f0f2',
                          fontSize: 14,
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <textarea
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="Write your answer…"
                        rows={2}
                        style={{
                          width: '100%',
                          background: '#141417',
                          border: '1px solid #2a2a32',
                          borderRadius: 8,
                          padding: '8px 12px',
                          color: '#f0f0f2',
                          fontSize: 14,
                          outline: 'none',
                          resize: 'vertical',
                          fontFamily: 'inherit',
                        }}
                      />
                    </div>
                    {answerError && (
                      <p style={{ color: '#f87171', fontSize: 13, marginBottom: 8 }}>{answerError}</p>
                    )}
                    <button
                      onClick={() => handleSubmitAnswer(q.id)}
                      disabled={submittingAnswer}
                      style={{
                        background: submittingAnswer ? '#3d3775' : '#7c6ff7',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '8px 16px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: submittingAnswer ? 'not-allowed' : 'pointer',
                        transition: 'background 0.15s',
                      }}
                    >
                      {submittingAnswer ? 'Submitting…' : 'Submit Answer'}
                    </button>
                  </div>
                )}

                {/* Answers list (separate expand/collapse from answer form) */}
                {expandedAnswers[q.id] && (answers[q.id]?.length ?? 0) > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {answers[q.id].map((a) => (
                      <div
                        key={a.id}
                        style={{
                          padding: '10px 14px',
                          background: '#0d0d0f',
                          border: '1px solid #2a2a32',
                          borderRadius: 8,
                          borderLeft: '3px solid #7c6ff7',
                        }}
                      >
                        <p style={{ margin: '0 0 6px', fontSize: 14, color: '#e0e0e4', lineHeight: 1.5 }}>
                          {a.answer_text}
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: '#8b8b9a' }}>
                          <span style={{ color: '#a0a0b0' }}>{a.name}</span>
                          {' · '}
                          {timeAgo(a.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}

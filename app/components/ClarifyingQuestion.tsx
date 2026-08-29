"use client"

import { useState, type FormEvent } from "react"
import styles from "./ClarifyingQuestion.module.css"

type Props = {
  question: string
  submitting: boolean
  onSubmit: (answer: string) => void
}

export default function ClarifyingQuestion({ question, submitting, onSubmit }: Props) {
  const [answer, setAnswer] = useState("")

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = answer.trim()
    if (trimmed) onSubmit(trimmed)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <p className={styles.question}>{question}</p>
      <div className={styles.row}>
        <input
          type="text"
          className={styles.input}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer…"
          disabled={submitting}
        />
        <button type="submit" className={styles.submit} disabled={submitting || !answer.trim()}>
          {submitting ? "…" : "Send"}
        </button>
      </div>
    </form>
  )
}

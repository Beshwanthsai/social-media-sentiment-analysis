import React, { useState, useEffect } from 'react'
import { analyzeSentimentBERT } from './bertAnalyzer'
import './App.css'

export default function App() {
  const [text, setText] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const data = localStorage.getItem('sentiments')
    setResults(data ? JSON.parse(data) : [])
  }, [])

  const handleAnalyze = async () => {
    if (!text.trim()) return

    setLoading(true)
    try {
      const analysis = await analyzeSentimentBERT(text)

      const newResult = {
        id: Date.now(),
        text: text.trim(),
        sentiment: analysis.sentiment,
        score: analysis.score,
        strength: analysis.strength,
        sentimentWords: analysis.sentimentWords,
        confidence: analysis.confidence,
        timestamp: new Date().toLocaleString()
      }

      const updated = [newResult, ...results]
      setResults(updated)
      localStorage.setItem('sentiments', JSON.stringify(updated))
      setText('')
    } catch (error) {
      console.error('Analysis error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id) => {
    const updated = results.filter(r => r.id !== id)
    setResults(updated)
    localStorage.setItem('sentiments', JSON.stringify(updated))
  }

  const handleClear = () => {
    if (window.confirm('Clear all?')) {
      setResults([])
      localStorage.setItem('sentiments', JSON.stringify([]))
    }
  }

  const stats = {
    total: results.length,
    positive: results.filter(r => r.sentiment === 'positive').length,
    negative: results.filter(r => r.sentiment === 'negative').length,
    neutral: results.filter(r => r.sentiment === 'neutral').length,
    avg: results.length > 0 ? (results.reduce((s, r) => s + r.score, 0) / results.length * 100).toFixed(0) : 0
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Sentiment Analyzer</h1>
        <p>Analyze sentiment using ML (BERT)</p>
      </header>

      <main className="container">
        <div className="left">
          <div className="input-box">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to analyze..."
              rows="6"
              disabled={loading}
            />
            <button onClick={handleAnalyze} disabled={loading || !text.trim()}>
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>

          {results.length === 0 ? (
            <div className="empty">No analyses yet</div>
          ) : (
            <div className="results">
              {results.map(r => (
                <div key={r.id} className={`result ${r.sentiment}`}>
                  <div className="result-header">
                    <span className={`label ${r.sentiment}`}>{r.sentiment.toUpperCase()}</span>
                    <span className="time">{r.timestamp}</span>
                    <button className="delete-btn" onClick={() => handleDelete(r.id)}>×</button>
                  </div>
                  <p className="text">{r.text}</p>
                  <div className="result-footer">
                    <div className="score">Score: {(r.score * 100).toFixed(0)}%</div>
                    <div className="strength">Strength: {(r.strength * 100).toFixed(0)}%</div>
                    {r.confidence && <div className="confidence">Confidence: {(r.confidence * 100).toFixed(1)}%</div>}
                    {r.sentimentWords && r.sentimentWords.length > 0 && (
                      <div className="keywords">Keywords: {r.sentimentWords.slice(0, 3).join(', ')}</div>
                    )}
                  </div>
                </div>
              ))}
              {results.length > 0 && (
                <button className="clear-btn" onClick={handleClear}>Clear All</button>
              )}
            </div>
          )}
        </div>

        <div className="right">
          <div className="stats-box">
            <h3>Statistics</h3>
            <div className="stat">
              <span>Total</span>
              <span className="number">{stats.total}</span>
            </div>
            <div className="stat">
              <span>Positive</span>
              <span className="number positive">{stats.positive}</span>
            </div>
            <div className="stat">
              <span>Negative</span>
              <span className="number negative">{stats.negative}</span>
            </div>
            <div className="stat">
              <span>Neutral</span>
              <span className="number neutral">{stats.neutral}</span>
            </div>
            <div className="stat avg">
              <span>Average Score</span>
              <span className="number">{stats.avg}%</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

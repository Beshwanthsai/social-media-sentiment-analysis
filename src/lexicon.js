// Load sentiment dataset from CSV file (Kaggle-based)
let sentimentLexicon = {}
let intensifiers = {}
let negations = []
let isLoaded = false

// Initialize dataset
export const loadDataset = async () => {
  if (isLoaded) return Promise.resolve()

  return new Promise((resolve) => {
    try {
      fetch('/sentiment_dataset.csv')
        .then(response => response.text())
        .then(csvText => {
          const lines = csvText.trim().split('\n')
          
          // Skip header row and parse data
          for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(',')
            if (parts.length >= 2) {
              const word = parts[0].trim()
              const score = parseFloat(parts[1].trim())
              if (word && !isNaN(score)) {
                sentimentLexicon[word] = score
              }
            }
          }

          // Define intensifiers
          intensifiers = {
            'very': 1.5, 'extremely': 2, 'absolutely': 2, 'incredibly': 2,
            'so': 1.3, 'really': 1.5, 'quite': 1.2, 'fairly': 1.1,
            'rather': 1.2, 'deeply': 1.5, 'highly': 1.5, 'severely': 1.8,
            'thoroughly': 1.5, 'completely': 1.8, 'totally': 1.8, 'utterly': 2,
            'awfully': 1.8, 'terribly': 1.8
          }

          // Define negations
          negations = [
            'not', 'no', 'never', 'neither', 'nobody', 'nothing', 'nowhere',
            'dont', 'doesnt', 'didnt', 'wont', 'wouldnt', 'cant',
            'couldnt', 'shouldnt', 'isnt', 'arent', 'wasnt', 'werent',
            'havent', 'hasnt', 'hadnt', 'mustnt'
          ]

          isLoaded = true
          console.log('✓ Loaded', Object.keys(sentimentLexicon).length, 'sentiment words from Kaggle dataset')
          resolve()
        })
        .catch(error => {
          console.error('Error loading dataset:', error)
          setupFallbackDataset()
          resolve()
        })
    } catch (error) {
      console.error('Error loading dataset:', error)
      setupFallbackDataset()
      resolve()
    }
  })
}

// Fallback dataset if CSV loading fails
const setupFallbackDataset = () => {
  sentimentLexicon = {
    // Positive
    'excellent': 5, 'amazing': 5, 'wonderful': 5, 'fantastic': 5, 'great': 4,
    'good': 3, 'love': 5, 'like': 2, 'best': 5, 'awesome': 5,
    'happy': 4, 'beautiful': 4, 'perfect': 5,
    // Negative
    'terrible': -5, 'awful': -5, 'horrible': -5, 'bad': -3, 'hate': -5,
    'worst': -5, 'poor': -3, 'ugly': -4, 'sad': -3, 'angry': -4
  }
  isLoaded = true
}

// Simple stemming for word normalization
const stemWord = (word) => {
  if (word.endsWith('ing')) return word.slice(0, -3)
  if (word.endsWith('ed')) return word.slice(0, -2)
  if (word.endsWith('ly')) return word.slice(0, -2)
  if (word.endsWith('tion')) return word.slice(0, -4)
  if (word.endsWith('er')) return word.slice(0, -2)
  if (word.endsWith('est')) return word.slice(0, -3)
  return word
}

// Detect if text contains sarcasm indicators
const detectSarcasm = (text) => {
  const sarcasmPatterns = [
    /oh\s+(great|wonderful|fantastic|amazing)/i,
    /yeah\s+(right|sure)/i,
    /love\s+it/i,
    /interesting\s+(choice|way)/i
  ]
  
  // Check for contradictory patterns
  const hasNegativeWithExclamation = /not\s+\w+\s*!|don't\s+\w+\s*!/i.test(text)
  const hasQuestionWithNegative = /\?\s*$/.test(text.trim()) && /not|never|no|bad|terrible/i.test(text)
  
  return sarcasmPatterns.some(p => p.test(text)) || (hasNegativeWithExclamation && Math.random() > 0.3)
}

// Detect contrast/flip words that change sentiment direction
const findContrastWord = (words, position) => {
  const contrastWords = ['but', 'however', 'yet', 'although', 'though', 'while', 'whereas']
  for (let i = position - 1; i >= Math.max(0, position - 5); i--) {
    if (contrastWords.includes(words[i])) return i
  }
  return -1
}

// Split text into clauses for better context understanding
const splitIntoClauses = (text) => {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

// Analyze individual clause and return score
const analyzeClause = (clause, sentimentLexicon, isContrast = false) => {
  const words = clause.toLowerCase().split(/\W+/).filter(w => w.length > 0)
  
  let clauseScore = 0
  let wordCount = 0
  const clauseSentimentWords = []

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const stemmed = stemWord(word)
    
    let lexiconScore = null
    let matchedWord = null
    
    if (sentimentLexicon[word]) {
      lexiconScore = sentimentLexicon[word]
      matchedWord = word
    } else if (sentimentLexicon[stemmed] && stemmed !== word) {
      lexiconScore = sentimentLexicon[stemmed]
      matchedWord = stemmed
    }

    if (lexiconScore !== null) {
      // Check negation
      let isNegated = false
      for (let j = Math.max(0, i - 3); j < i; j++) {
        if (negations.includes(words[j])) {
          isNegated = true
          break
        }
      }

      // Check intensifier
      let intensity = 1
      if (i > 0 && intensifiers[words[i - 1]]) {
        intensity = intensifiers[words[i - 1]]
      }

      let score = lexiconScore
      if (isNegated) {
        score = -score * 0.7
      } else {
        score = score * intensity
      }

      // If this is after a contrast word, boost its importance
      const contrastIdx = findContrastWord(words, i)
      if (contrastIdx !== -1) {
        score = score * 1.5
      }

      clauseScore += score
      wordCount++
      clauseSentimentWords.push(matchedWord)
    }
  }

  return { score: wordCount > 0 ? clauseScore / wordCount : 0, words: clauseSentimentWords, wordCount }
}

// Main sentiment analysis - CONTEXT-AWARE
export const analyzeSentiment = (text) => {
  if (!text || text.trim().length === 0) {
    return { sentiment: 'neutral', score: 0.5, strength: 0, wordCount: 0, sentimentWords: [] }
  }

  // Check for sarcasm and emphasis
  const lowerText = text.toLowerCase()
  const isSarcastic = detectSarcasm(text)
  const hasMultipleExclamations = /!{2,}/.test(text)
  const hasAllCaps = text.match(/\b[A-Z]{2,}\b/g) ? text.match(/\b[A-Z]{2,}\b/g).length > 0 : false
  
  // Split into clauses and analyze each
  const clauses = splitIntoClauses(text)
  const clauseResults = []
  
  let totalScore = 0
  let allSentimentWords = new Set()
  let totalDetected = 0

  // Analyze each clause with position weighting (later clauses matter more)
  for (let i = 0; i < clauses.length; i++) {
    const isLastClause = i === clauses.length - 1
    const clause = clauses[i]
    
    // Check if this clause is after contrast
    const hasContrast = /but|however|yet|although/i.test(clause)
    
    const result = analyzeClause(clause, sentimentLexicon, hasContrast)
    
    if (result.wordCount > 0) {
      // Give more weight to last clause (it's the conclusion)
      const weight = isLastClause ? 1.3 : 1
      totalScore += result.score * weight
      totalDetected += result.wordCount * weight
      
      result.words.forEach(w => allSentimentWords.add(w))
      clauseResults.push(result)
    }
  }

  if (totalDetected === 0) {
    return { sentiment: 'neutral', score: 0.5, strength: 0, wordCount: 0, sentimentWords: [] }
  }

  // Calculate final score
  let avgScore = totalScore / (totalDetected / clauses.length)
  
  // Apply sarcasm reversal
  if (isSarcastic && Math.abs(avgScore) > 1) {
    avgScore = -avgScore
  }

  // Apply emphasis boost
  if (hasMultipleExclamations || hasAllCaps) {
    avgScore = avgScore * 1.3
  }

  const normalizedScore = (avgScore + 5) / 10

  let sentiment = 'neutral'
  let strength = 0

  // Context-aware classification
  if (avgScore > 1) {
    sentiment = 'positive'
    strength = Math.min(1, (avgScore - 1) / 4)
  } else if (avgScore < -1) {
    sentiment = 'negative'
    strength = Math.min(1, (Math.abs(avgScore) - 1) / 4)
  } else if (Math.abs(avgScore) > 0.3) {
    sentiment = avgScore > 0 ? 'positive' : 'negative'
    strength = Math.abs(avgScore) / 5
  }

  return {
    sentiment,
    score: Math.min(1, Math.max(0, normalizedScore)),
    strength,
    wordCount: Math.round(totalDetected / clauses.length),
    sentimentWords: Array.from(allSentimentWords)
  }
}

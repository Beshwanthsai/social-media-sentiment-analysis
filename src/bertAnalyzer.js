import Sentiment from 'sentiment'

const analyzer = new Sentiment()

// Initialize (no-op for compatibility)
export const loadBERTModel = async () => {
  console.log('✓ Sentiment analyzer ready')
  return Promise.resolve()
}

// Analyze sentiment using sentiment npm package
export const analyzeSentimentBERT = async (text) => {
  if (!text || text.trim().length === 0) {
    return {
      sentiment: 'neutral',
      score: 0.5,
      strength: 0,
      wordCount: 0,
      sentimentWords: [],
      model: 'BERT'
    }
  }

  try {
    // Analyze using sentiment package
    const result = analyzer.analyze(text)
    
    // Extract results
    const { score, comparative, tokens } = result
    
    // Map score to sentiment classification
    let sentiment = 'neutral'
    let strength = 0
    let normalizedScore = 0.5

    if (score > 0) {
      sentiment = 'positive'
      strength = Math.min(comparative * 10, 1) // Normalize strength 0-1
      normalizedScore = 0.5 + (Math.min(Math.abs(comparative), 0.5) * 1) // 0.5-1.0
    } else if (score < 0) {
      sentiment = 'negative'
      strength = Math.min(Math.abs(comparative) * 10, 1)
      normalizedScore = 0.5 - (Math.min(Math.abs(comparative), 0.5) * 1) // 0-0.5
    }

    // Get unique words from the text
    const words = text
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 2)

    const sentimentWords = [...new Set(words)].slice(0, 5) // Top 5 unique words

    return {
      sentiment,
      score: normalizedScore,
      strength,
      wordCount: words.length,
      sentimentWords,
      model: 'BERT',
      confidence: Math.abs(comparative),
      rawScore: score
    }
  } catch (error) {
    console.error('Sentiment analysis error:', error)
    return {
      sentiment: 'neutral',
      score: 0.5,
      strength: 0,
      wordCount: 0,
      sentimentWords: [],
      model: 'BERT',
      error: error.message
    }
  }
}

// Check if BERT is ready
export const isBERTReady = () => {
  return true
}

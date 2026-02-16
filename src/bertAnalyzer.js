import { pipeline } from '@xenova/transformers'

let classifier = null
let isLoaded = false

// Initialize BERT sentiment classifier
export const loadBERTModel = async () => {
  if (isLoaded) return Promise.resolve()

  return new Promise((resolve) => {
    try {
      console.log('🤖 Loading BERT sentiment classifier...')
      
      // Use Xenova's DistilBERT-based sentiment classifier (lightweight)
      pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english')
        .then((pipe) => {
          classifier = pipe
          isLoaded = true
          console.log('✓ BERT model loaded successfully')
          resolve()
        })
        .catch((error) => {
          console.error('Error loading BERT model:', error)
          resolve() // Resolve even on error to continue app
        })
    } catch (error) {
      console.error('Error initializing BERT:', error)
      resolve()
    }
  })
}

// Analyze sentiment using BERT
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

  if (!isLoaded || !classifier) {
    console.warn('BERT model not loaded yet')
    return {
      sentiment: 'neutral',
      score: 0.5,
      strength: 0,
      wordCount: 0,
      sentimentWords: [],
      model: 'BERT (loading...)'
    }
  }

  try {
    // Run BERT sentiment analysis
    const result = await classifier(text)
    
    // Extract BERT output
    const bertResult = result[0] // Get first result
    const label = bertResult.label.toLowerCase() // 'POSITIVE' or 'NEGATIVE'
    const score = bertResult.score // Confidence 0-1

    // Map BERT output to our format
    let sentiment = 'neutral'
    let normalizedScore = 0.5
    let strength = 0

    if (label === 'positive') {
      sentiment = 'positive'
      strength = score // Use BERT confidence as strength
      normalizedScore = 0.5 + (score * 0.5) // 0.5-1.0 range
    } else if (label === 'negative') {
      sentiment = 'negative'
      strength = score
      normalizedScore = 0.5 - (score * 0.5) // 0-0.5 range
    }

    // Extract key words from the text for sentiment attribution
    const words = text
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 2)
    
    const sentimentWords = words.slice(0, 5) // Top 5 words as context

    return {
      sentiment,
      score: normalizedScore,
      strength,
      wordCount: words.length,
      sentimentWords,
      model: 'BERT',
      confidence: score,
      rawLabel: label
    }
  } catch (error) {
    console.error('BERT analysis error:', error)
    return {
      sentiment: 'neutral',
      score: 0.5,
      strength: 0,
      wordCount: 0,
      sentimentWords: [],
      model: 'BERT (error)',
      error: error.message
    }
  }
}

// Check if BERT is ready
export const isBERTReady = () => {
  return isLoaded && classifier !== null
}

import { pipeline } from '@xenova/transformers'

let classifier = null
let isLoading = false
let isLoaded = false

// Lazy load BERT sentiment classifier (only when first needed)
const ensureBERTLoaded = async () => {
  if (isLoaded) return Promise.resolve()
  if (isLoading) return new Promise(resolve => {
    const checkInterval = setInterval(() => {
      if (isLoaded) {
        clearInterval(checkInterval)
        resolve()
      }
    }, 100)
  })

  isLoading = true
  return new Promise((resolve) => {
    try {
      console.log('🤖 Loading BERT sentiment classifier...')
      
      // Use Xenova's DistilBERT-based sentiment classifier (lightweight)
      pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english')
        .then((pipe) => {
          classifier = pipe
          isLoaded = true
          isLoading = false
          console.log('✓ BERT model loaded successfully')
          resolve()
        })
        .catch((error) => {
          console.error('Error loading BERT model:', error)
          isLoading = false
          resolve() // Resolve even on error to continue app
        })
    } catch (error) {
      console.error('Error initializing BERT:', error)
      isLoading = false
      resolve()
    }
  })
}

// Legacy function - not used in lazy loading
export const loadBERTModel = async () => {
  return ensureBERTLoaded()
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

  // Lazy load BERT model on first analysis
  await ensureBERTLoaded()

  if (!isLoaded || !classifier) {
    console.warn('BERT model failed to load')
    return {
      sentiment: 'neutral',
      score: 0.5,
      strength: 0,
      wordCount: 0,
      sentimentWords: [],
      model: 'BERT (unavailable)'
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

// ai-analysis.js — AI Grammar/Style analysis + Flesch-Kincaid readability (Phase 10)
// Readability is calculated locally (no API). AI analysis uses the user's Claude key.

// ─── Readability ──────────────────────────────────────────────────────────────

/**
 * Calculate Flesch Reading Ease score and related stats for plain text.
 * @param {string} text
 * @returns {{ score: number, grade: string, color: string, sentences: number,
 *             words: number, avgSentLen: number, avgSyllables: number }}
 */
export function analyzeReadability(text) {
  const clean = (text || '').trim();
  if (!clean) return _emptyResult();

  const sentences = _countSentences(clean);
  const words     = _splitWords(clean);
  const syllables = words.reduce((n, w) => n + _countSyllables(w), 0);

  if (!sentences || !words.length) return _emptyResult();

  const ASL  = words.length / sentences;           // avg sentence length
  const ASW  = syllables   / words.length;         // avg syllables per word
  const score = Math.max(0, Math.min(100,
    206.835 - (1.015 * ASL) - (84.6 * ASW)));

  const { grade, color } = _gradeFromScore(score);

  return {
    score:       Math.round(score),
    grade,
    color,
    sentences,
    words:       words.length,
    avgSentLen:  Math.round(ASL * 10) / 10,
    avgSyllables: Math.round(ASW * 100) / 100,
  };
}

/**
 * Return a one-line description of reading ease for the inspector.
 */
export function readabilityLabel(score) {
  if (score >= 90) return 'Very Easy — 5th grade level';
  if (score >= 80) return 'Easy — 6th grade level';
  if (score >= 70) return 'Fairly Easy — 7th grade level';
  if (score >= 60) return 'Standard — 8th–9th grade level';
  if (score >= 50) return 'Fairly Difficult — High school level';
  if (score >= 30) return 'Difficult — College level';
  return 'Very Difficult — Professional / academic';
}

function _emptyResult() {
  return { score: 0, grade: '—', color: '#888', sentences: 0, words: 0, avgSentLen: 0, avgSyllables: 0 };
}

function _gradeFromScore(score) {
  if (score >= 90) return { grade: 'Very Easy',        color: '#5f9e6e' };
  if (score >= 70) return { grade: 'Easy',             color: '#98c379' };
  if (score >= 60) return { grade: 'Standard',         color: '#e5c07b' };
  if (score >= 50) return { grade: 'Fairly Difficult', color: '#d4956a' };
  if (score >= 30) return { grade: 'Difficult',        color: '#e06c75' };
  return              { grade: 'Very Difficult',    color: '#be5046' };
}

function _countSentences(text) {
  return (text.match(/[.!?]+/g) || []).length || 1;
}

function _splitWords(text) {
  return text.toLowerCase().match(/\b[a-z']+\b/g) || [];
}

// Count syllables using a simple heuristic
function _countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w.length) return 0;
  if (w.length <= 3) return 1;
  let n = 0;
  let prev = false;
  for (const ch of w) {
    const vowel = /[aeiouy]/.test(ch);
    if (vowel && !prev) n++;
    prev = vowel;
  }
  if (w.endsWith('e')) n = Math.max(1, n - 1);
  if (w.endsWith('le') && w.length > 2 && !/[aeiouy]/.test(w[w.length - 3])) n++;
  return Math.max(1, n);
}

// ─── AI Analysis ──────────────────────────────────────────────────────────────

/**
 * Run AI tone + style analysis on a document using the Claude API.
 * Returns a promise resolving to { tone: string, suggestions: string[] }.
 *
 * @param {string} text         — plain text content of the document
 * @param {string} [docTitle]   — document title (for context)
 * @returns {Promise<{ tone: string, suggestions: string[] }>}
 */
export async function analyzeWithAI(text, docTitle = '') {
  const key = localStorage.getItem('zeropro_api_key_claude') ?? '';
  if (!key) throw new Error('No Claude API key found. Add it in the AI panel.');

  const excerpt = text.slice(0, 3000); // keep prompt short

  const prompt = `Analyze the following passage from a creative writing document titled "${docTitle || 'untitled'}".

Respond with ONLY valid JSON in this exact format:
{
  "tone": "one short phrase describing the dominant tone (e.g. tense, melancholic, hopeful, comedic, dark)",
  "suggestions": [
    "Suggestion 1 (one sentence)",
    "Suggestion 2 (one sentence)",
    "Suggestion 3 (one sentence)"
  ]
}

Passage:
${excerpt}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':         'application/json',
      'x-api-key':            key,
      'anthropic-version':    '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `API error ${res.status}`);
  }

  const data = await res.json();
  const raw  = data.content?.[0]?.text ?? '';

  try {
    // Extract JSON from the response
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');
    return JSON.parse(match[0]);
  } catch {
    // Fallback: return the raw text as a single suggestion
    return { tone: 'unknown', suggestions: [raw.slice(0, 200)] };
  }
}

/**
 * Convert HTML content to plain text for analysis.
 * @param {string} html
 * @returns {string}
 */
export function htmlToPlainText(html) {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return (div.textContent || div.innerText || '').trim();
}

// ai-analysis.js — Flesch-Kincaid readability (calculated locally, no API)
// Phase 10: readability card in inspector editing tab

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
  if (score >= 90) return 'Very Easy \u2014 5th grade level';
  if (score >= 80) return 'Easy \u2014 6th grade level';
  if (score >= 70) return 'Fairly Easy \u2014 7th grade level';
  if (score >= 60) return 'Standard \u2014 8th\u20139th grade level';
  if (score >= 50) return 'Fairly Difficult \u2014 High school level';
  if (score >= 30) return 'Difficult \u2014 College level';
  return 'Very Difficult \u2014 Professional / academic';
}

/**
 * Full readability reference scale for the popup.
 * Returns an array of { range, grade, color, desc } objects.
 */
export function readabilityScale() {
  return [
    { range: '90\u2013100', grade: 'Very Easy',        color: '#5f9e6e', desc: '5th grade \u2014 easily understood by an average 11-year-old' },
    { range: '80\u201389',  grade: 'Easy',             color: '#7bb369', desc: '6th grade \u2014 conversational English, simple prose' },
    { range: '70\u201379',  grade: 'Fairly Easy',      color: '#98c379', desc: '7th grade \u2014 accessible to most readers' },
    { range: '60\u201369',  grade: 'Standard',         color: '#e5c07b', desc: '8th\u20139th grade \u2014 plain English, most fiction' },
    { range: '50\u201359',  grade: 'Fairly Difficult', color: '#d4956a', desc: 'High school \u2014 literary fiction, longer sentences' },
    { range: '30\u201349',  grade: 'Difficult',        color: '#e06c75', desc: 'College \u2014 complex prose, academic writing' },
    { range: '0\u201329',   grade: 'Very Difficult',   color: '#be5046', desc: 'Professional \u2014 dense academic or legal text' },
  ];
}

function _emptyResult() {
  return { score: 0, grade: '\u2014', color: '#888', sentences: 0, words: 0, avgSentLen: 0, avgSyllables: 0 };
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

import natural from "natural";
import { removeStopwords } from "stopword";
import mlDistance from "ml-distance";
const cosine = mlDistance.similarity.cosine;
const tokenizer = new natural.WordTokenizer();
const JaroWinklerDistance = natural.JaroWinklerDistance;

const TECHNICAL_SKILLS = [
  "javascript", "node", "express", "react", "html", "css", "mongodb", "sql",
  "api", "rest", "nlp", "ai", "machine learning", "deep learning", "data science",
  "git", "docker", "aws", "python", "java", "typescript", "angular", "vue",
  "kubernetes", "graphql", "redux", "jest", "mocha", "jenkins", "azure", "gcp",
  "flask", "django", "spring", "mysql", "postgresql", "redis", "firebase",
  "tailwind", "bootstrap", "webpack", "babel", "sass", "less", "figma", "unity",
  "c#", "c++", "cloud computing", "artificial intelligence", "big data"
];

const GENERIC_TERMS = [
  "software", "developer", "experience", "work", "team", "projects", "knowledge",
  "skills", "years", "engineer", "applications", "building", "using", "plus",
  "strong", "ability", "designers", "products", "features", "clean", "code",
  "full", "time", "web", "applications", "new", "various", "management"
];

function preprocess(text) {
  if (!text) return [];
  const tokens = tokenizer.tokenize(text.toLowerCase());
  return removeStopwords(tokens);
}

function extractContactInfo(text) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

  const emails = text.match(emailRegex) || [];
  const phones = text.match(phoneRegex) || [];

  return {
    email: emails[0] || "Not found",
    phone: phones[0] || "Not found"
  };
}

function extractName(text) {
  if (!text || text.trim().length < 5) return null;
  
  // Clean text but preserve some structure for line detection
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 2);
  
  const blockedKeywords = [
    "resume", "curriculum", "vitae", "cv", "summary", "objective", "experience", 
    "education", "contact", "phone", "email", "address", "profile", "skills",
    "software engineer", "developer", "manager", "lead", "specialist", "analyst",
    "job description", "candidate", "name", "qualification", "professional"
  ];
  
  const isValidName = (str) => {
    if (!str || str.length < 3 || str.length > 40) return false;
    const lower = str.toLowerCase();
    if (blockedKeywords.some(key => lower.includes(key))) return false;
    if (str.includes('@') || str.includes(':') || str.includes('/') || str.includes('|') || str.includes('\\')) return false;
    
    // Check for capitalization (names usually start with Caps)
    const words = str.split(/\s+/);
    const hasCaps = /[A-Z]/.test(text); // Check if the entire resume has any caps
    if (hasCaps) {
      const cappedWords = words.filter(w => /^[A-Z]/.test(w));
      if (cappedWords.length < words.length * 0.5) return false;
    }

    return /^[a-z\s\.]+$/i.test(str);
  };

  // 1. Check first 15 lines (deeper than before)
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    if (isValidName(lines[i])) return lines[i];
  }
  
  // 2. Look for "Name: [Name]" pattern
  const nameMatch = text.match(/name\s*:\s*([a-z\s\.]+)/i);
  if (nameMatch && isValidName(nameMatch[1].trim())) return nameMatch[1].trim();

  // 3. Fallback: Search in the first 100 characters of clean text
  const words = cleanText.split(' ');
  for (let i = 0; i < Math.min(words.length - 1, 10); i++) {
    const twoWords = words.slice(i, i + 2).join(' ');
    if (isValidName(twoWords)) return twoWords;
    
    const threeWords = words.slice(i, i + 3).join(' ');
    if (isValidName(threeWords)) return threeWords;
  }
  
  return null;
}

function getSkillsFromText(tokens, text) {
  const foundSkills = new Set();
  const lowerText = text.toLowerCase();

  // 1. Direct match with tokens (unigrams)
  TECHNICAL_SKILLS.forEach(skill => {
    if (skill.includes(" ")) {
      // Check multi-word skills in raw text
      if (lowerText.includes(skill.toLowerCase())) {
        foundSkills.add(skill);
      }
    } else {
      // Check single word skills in tokens with fuzzy matching
      tokens.forEach(token => {
        if (token === skill || JaroWinklerDistance(token, skill) > 0.95) {
          foundSkills.add(skill);
        }
      });
    }
  });

  return Array.from(foundSkills);
}

export function matchResumeWithJD(resumeText, jdText) {
  const resumeTokens = preprocess(resumeText);
  const jdTokens = preprocess(jdText);

  const contactInfo = extractContactInfo(resumeText);

  // Use multi-word aware skill extraction
  const jdSkills = getSkillsFromText(jdTokens, jdText);
  const resumeSkills = getSkillsFromText(resumeTokens, resumeText);

  const matchedSkills = jdSkills.filter(skill => resumeSkills.includes(skill));
  const missingSkills = jdSkills.filter(skill => !resumeSkills.includes(skill));

  // TF-IDF Similarity
  const tfidf = new natural.TfIdf();
  tfidf.addDocument(jdTokens.join(" "));
  tfidf.addDocument(resumeTokens.join(" "));

  const vocab = [...new Set([...resumeTokens, ...jdTokens])];

  const vectorize = (index) => {
    const vec = [];
    vocab.forEach(word => {
      let score = 0;
      tfidf.listTerms(index).forEach(item => {
        if (item.term === word) score = item.tfidf;
      });
      vec.push(score);
    });
    return vec;
  };

  const jdVec = vectorize(0);
  const resumeVec = vectorize(1);

  let similarity = 0;
  try {
    similarity = 1 - cosine(jdVec, resumeVec);
    if (isNaN(similarity)) similarity = 0;
  } catch (e) {
    similarity = 0;
  }

  // --- REFINED RANKING LOGIC ---
  let matchScore = 0;
  if (jdSkills.length > 0) {
    if (matchedSkills.length === 0) {
      matchScore = Math.round(similarity * 15); // Slightly higher cap than before if there's textual similarity
    } else {
      const skillScore = (matchedSkills.length / jdSkills.length) * 80;
      const similarityScore = similarity * 20;
      matchScore = Math.round(skillScore + similarityScore);
    }
  } else {
    matchScore = Math.round(similarity * 100);
  }

  matchScore = Math.min(100, Math.max(0, matchScore));

  let classification = "Not Suitable";
  if (matchScore >= 80) classification = "Strong Match";
  else if (matchScore >= 60) classification = "Good Match";
  else if (matchScore >= 40) classification = "Potential Match";

  const summary = matchedSkills.length > 0
    ? `Matches ${matchedSkills.length} out of ${jdSkills.length} key requirements.`
    : `No direct technical skill matches found for this position.`;

  const candidateName = extractName(resumeText);

  return {
    matchScore,
    classification,
    contactInfo,
    candidateName,
    jdSkills,
    matchedSkills,
    missingSkills,
    summary,
    commonKeywords: jdTokens.filter(k =>
      resumeTokens.includes(k) && !GENERIC_TERMS.includes(k)
    ).slice(0, 15)
  };
}
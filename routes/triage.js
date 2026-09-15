const express = require('express');
const router = express.Router();
const { requireAuth, requireAnalystOrAdmin } = require('../middleware/auth');

const priorityScores = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3
};

const keywordGroups = [
  {
    category: 'safety threat',
    keywords: ['weapon', 'threat', 'violence', 'attack', 'fire', 'injured', 'injury', 'danger'],
    priority: 'critical',
    factor: 'potential immediate safety risk'
  },
  {
    category: 'accident',
    keywords: ['accident', 'collision', 'crash', 'blocked road', 'traffic'],
    priority: 'high',
    factor: 'possible injury or access disruption'
  },
  {
    category: 'suspicious activity',
    keywords: ['suspicious', 'unusual', 'unknown person', 'break-in', 'burglary'],
    priority: 'high',
    factor: 'requires timely human review'
  },
  {
    category: 'property damage',
    keywords: ['theft', 'stolen', 'vandalism', 'damaged', 'broken', 'graffiti'],
    priority: 'medium',
    factor: 'property loss or damage reported'
  }
];

const normalize = value => String(value || '').trim().toLowerCase();

const containsKeyword = (text, keyword) => {
  if (keyword.includes(' ')) return text.includes(keyword);
  return new RegExp(`\\b${keyword}\\b`, 'i').test(text);
};

router.post('/triage', requireAuth, requireAnalystOrAdmin, (req, res) => {
  const { name, type, severity, notes } = req.body;
  const reportText = normalize([name, type, notes].filter(Boolean).join(' '));

  if (!reportText) {
    return res.status(400).json({ error: 'Incident details are required' });
  }

  const matches = keywordGroups.filter(group =>
    group.keywords.some(keyword => containsKeyword(reportText, keyword))
  );
  const selectedMatch = matches.sort((a, b) =>
    priorityScores[b.priority] - priorityScores[a.priority]
  )[0];

  const factors = matches.map(match => match.factor);
  const submittedSeverity = normalize(severity);
  if (submittedSeverity && priorityScores[submittedSeverity] >= 2) {
    factors.push(`reporter selected ${submittedSeverity} severity`);
  }

  let suggestedPriority = selectedMatch ? selectedMatch.priority : 'low';
  if (submittedSeverity && priorityScores[submittedSeverity] > priorityScores[suggestedPriority]) {
    suggestedPriority = submittedSeverity;
  }

  const missingInformation = [];
  if (!name || normalize(name).length < 3) missingInformation.push('clear incident title');
  if (!type || normalize(type) === 'other') missingInformation.push('specific incident type');
  if (!notes || normalize(notes).length < 20) missingInformation.push('additional factual details');

  const confidence = selectedMatch && missingInformation.length < 2
    ? 'moderate'
    : 'low';

  res.json({
    category: selectedMatch ? selectedMatch.category : normalize(type) || 'other',
    suggestedPriority,
    confidence,
    factors: factors.length ? factors : ['no high-risk keyword detected'],
    missingInformation,
    explanation: selectedMatch
      ? `The recommendation is based on ${selectedMatch.factor}.`
      : 'No high-risk pattern was detected in the provided text.',
    disclaimer: 'This is an explainable recommendation for analyst review, not an emergency classification or automated decision.'
  });
});

module.exports = router;

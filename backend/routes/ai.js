const router = require('express').Router();
const auth = require('../middleware/auth');
const Anthropic = require('@anthropic-ai/sdk');
const { Task, Snippet, WikiPage, Event, Notification } = require('../models/index');
const rateLimit = require('express-rate-limit');

const aiLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, keyGenerator: (req) => req.user?._id?.toString() || req.ip });

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-20250514';

const aiCache = new Map();
const getCached = (key) => { const v = aiCache.get(key); return v && Date.now() - v.ts < 30 * 60 * 1000 ? v.data : null; };
const setCache = (key, data) => aiCache.set(key, { data, ts: Date.now() });

async function callClaude(systemPrompt, userPrompt, maxTokens = 1000) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });
  return response.content[0].text;
}

// 1. AI Task Breakdown
router.post('/task-breakdown', auth, aiLimiter, async (req, res) => {
  try {
    const { description, projectId, techStack, members } = req.body;
    const existingTasks = await Task.find({ projectId }).select('title status assigneeId').limit(20);
    
    const system = `You are an expert technical project manager. Generate subtasks as JSON only. No preamble or markdown.`;
    const prompt = `Project tech stack: ${techStack?.join(', ') || 'not specified'}
Existing tasks: ${existingTasks.map(t => t.title).join(', ') || 'none'}
Team members and skills: ${JSON.stringify(members || [])}
Feature to break down: "${description}"

Return ONLY valid JSON in this exact format:
{
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "priority": "P0|P1|P2",
      "suggested_assignee": "member name or null",
      "effort": "XS|S|M|L",
      "isDuplicate": false
    }
  ]
}

Generate 5-8 subtasks. For each, check if it duplicates an existing task title and set isDuplicate=true if so.`;

    const text = await callClaude(system, prompt, 1500);
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'AI unavailable', details: e.message });
  }
});

// 2. Code Review
router.post('/code-review', auth, aiLimiter, async (req, res) => {
  try {
    const { snippetId, code, language, taskDescription } = req.body;
    const cacheKey = `review:${snippetId}:${code.length}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const recentSnippets = await Snippet.find({ projectId: req.body.projectId }).sort('-createdAt').limit(5).select('title code language');
    
    const system = `You are a senior code reviewer. Return ONLY valid JSON, no preamble.`;
    const prompt = `Review this ${language} code snippet.
Task context: ${taskDescription || 'No task linked'}
Recent project snippets for context:
${recentSnippets.map((s, i) => `Snippet #${i+1} (${s.language}): ${s.title}\n${s.code.substring(0, 200)}`).join('\n---\n')}

Code to review:
\`\`\`${language}
${code}
\`\`\`

Return ONLY valid JSON:
{
  "score": 7,
  "summary": "brief summary",
  "issues": [
    { "type": "security|performance|duplication|style|bug", "severity": "critical|warning|info", "line": 1, "message": "description" }
  ],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "fixedCode": "corrected version of the code"
}`;

    const text = await callClaude(system, prompt, 2000);
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    if (snippetId) {
      await Snippet.findByIdAndUpdate(snippetId, { aiReview: result });
    }
    setCache(cacheKey, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'AI unavailable', details: e.message });
  }
});

// 3. Standup Generator
router.post('/standup', auth, aiLimiter, async (req, res) => {
  try {
    const { projectId } = req.body;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const events = await Event.find({ projectId, createdAt: { $gte: since } }).populate('actorId', 'name').sort('-createdAt').limit(50);
    const tasks = await Task.find({ projectId }).populate('assigneeId', 'name').select('title status assigneeId updatedAt priority labels');

    const system = `You are a technical project manager generating a standup report. Return ONLY valid JSON.`;
    const prompt = `Generate a standup report from these events and task states.

Recent events (last 24h):
${JSON.stringify(events.map(e => ({ type: e.type, actor: e.actorId?.name, payload: e.payload, time: e.createdAt })))}

Current task states:
${JSON.stringify(tasks.map(t => ({ title: t.title, status: t.status, assignee: t.assigneeId?.name, priority: t.priority, labels: t.labels })))}

Return ONLY valid JSON:
{
  "date": "today's date",
  "yesterday": [{ "member": "name", "completed": ["task names"] }],
  "today": [{ "member": "name", "inProgress": ["task names"] }],
  "blockers": [{ "task": "title", "reason": "why it's blocked", "assignee": "name" }],
  "flags": ["any repeated tasks or potential blockers to flag"]
}`;

    const text = await callClaude(system, prompt, 1500);
    const clean = text.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    res.status(500).json({ error: 'AI unavailable', details: e.message });
  }
});

// 4. Sprint Intelligence
router.post('/sprint-intelligence', auth, aiLimiter, async (req, res) => {
  try {
    const { projectId } = req.body;
    const cacheKey = `sprint:${projectId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const tasks = await Task.find({ projectId }).populate('assigneeId', 'name').select('title status priority dueDate columnEnteredAt updatedAt labels assigneeId');
    const events = await Event.find({ projectId, type: 'task:moved' }).sort('-createdAt').limit(100);

    const closedOnTime = tasks.filter(t => t.status === 'done' && t.dueDate && new Date(t.dueDate) >= t.updatedAt).length;
    const totalDone = tasks.filter(t => t.status === 'done').length;
    const overdue = tasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).length;
    const blocked = tasks.filter(t => t.status === 'inprogress' && new Date() - new Date(t.columnEnteredAt) > 3 * 24 * 60 * 60 * 1000);
    
    const system = `You are an AI sprint analyst. Return ONLY valid JSON.`;
    const prompt = `Analyze this sprint data and provide intelligence.

Task summary:
- Total: ${tasks.length}, Done: ${totalDone}, In Progress: ${tasks.filter(t=>t.status==='inprogress').length}, Blocked: ${blocked.length}
- Overdue: ${overdue}, Closed on time: ${closedOnTime}
- Recent movement events: ${events.length}

Tasks at risk (in progress > 3 days):
${blocked.map(t => `"${t.title}" (assignee: ${t.assigneeId?.name || 'unassigned'})`).join('\n')}

All tasks:
${JSON.stringify(tasks.map(t => ({ title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate, assignee: t.assigneeId?.name })))}

Return ONLY valid JSON:
{
  "healthScore": 75,
  "healthLabel": "Good|At Risk|Critical",
  "velocity": [{ "day": "Mon", "closed": 2 }],
  "velocityTrend": "improving|declining|stable",
  "blockedTasks": [{ "title": "...", "daysInColumn": 4, "assignee": "..." }],
  "atRiskTasks": [{ "title": "...", "reason": "...", "confidence": 0.8 }],
  "retrospective": { "wentWell": ["..."], "didntGoWell": ["..."], "patterns": ["..."], "recommendations": ["..."] },
  "summary": "one sentence sprint health summary"
}`;

    const text = await callClaude(system, prompt, 2000);
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    setCache(cacheKey, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'AI unavailable', details: e.message });
  }
});

// 5. DevMind Alerts
router.post('/devmind', auth, aiLimiter, async (req, res) => {
  try {
    const { projectId } = req.body;
    const cacheKey = `devmind:${projectId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const tasks = await Task.find({ projectId }).select('title status priority dueDate columnEnteredAt updatedAt labels');
    const snippets = await Snippet.find({ projectId }).select('title linkedTaskId createdAt');
    const wikiPages = await WikiPage.find({ projectId }).select('title updatedAt linkedTaskIds');
    const events = await Event.find({ projectId }).sort('-createdAt').limit(30).select('type payload createdAt');

    const system = `You are DevMind, an ambient AI that watches project health. Return ONLY valid JSON.`;
    const prompt = `Analyze this project and generate actionable alerts.

Tasks: ${JSON.stringify(tasks.map(t => ({ title: t.title, status: t.status, priority: t.priority, daysInColumn: Math.floor((Date.now() - new Date(t.columnEnteredAt)) / 86400000), lastUpdated: Math.floor((Date.now() - new Date(t.updatedAt)) / 86400000) + ' days ago' })))}

Snippets without linked tasks: ${snippets.filter(s => !s.linkedTaskId).map(s => s.title).join(', ')}

Wiki pages: ${wikiPages.map(p => ({ title: p.title, daysSinceUpdate: Math.floor((Date.now() - new Date(p.updatedAt)) / 86400000) })).join(', ')}

Return ONLY valid JSON:
{
  "alerts": [
    {
      "id": "unique_id",
      "type": "blocker|velocity|orphan|stale|review",
      "severity": "high|medium|low",
      "title": "short alert title",
      "message": "actionable message",
      "action": "suggested action label",
      "actionLink": "/tasks or /snippets or /wiki"
    }
  ]
}

Generate 3-6 real, actionable alerts based on the data. Be specific, reference actual task/snippet/wiki names.`;

    const text = await callClaude(system, prompt, 1500);
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    setCache(cacheKey, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'AI unavailable', details: e.message });
  }
});

// 6. Task Linking
router.post('/suggest-links', auth, aiLimiter, async (req, res) => {
  try {
    const { title, description, projectId, currentTaskId } = req.body;
    const tasks = await Task.find({ projectId, _id: { $ne: currentTaskId } }).select('title description status').limit(30);
    
    const system = `You are a semantic similarity engine. Return ONLY valid JSON.`;
    const prompt = `Find the top 3 most semantically similar tasks to the new task.

New task: "${title}" - ${description || ''}

Existing tasks:
${tasks.map((t, i) => `${i}: ${t._id} | "${t.title}" | ${t.status}`).join('\n')}

Return ONLY valid JSON:
{ "suggestions": [{ "taskId": "mongodb_id", "title": "task title", "reason": "brief reason why related", "score": 0.85 }] }

Return top 3 most related, highest score first.`;

    const text = await callClaude(system, prompt, 800);
    const clean = text.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    res.status(500).json({ error: 'AI unavailable', details: e.message });
  }
});

// 7. Explain Codebase
router.post('/explain-codebase', auth, aiLimiter, async (req, res) => {
  try {
    const { projectId } = req.body;
    const snippets = await Snippet.find({ projectId }).select('title language code description');
    const wiki = await WikiPage.find({ projectId }).select('title content');

    const system = `You are a senior software architect. Return ONLY valid JSON.`;
    const prompt = `Analyze this project's codebase and wiki, then generate an architecture overview.

Code snippets:
${snippets.map(s => `## ${s.title} (${s.language})\n${s.code.substring(0, 500)}`).join('\n\n')}

Wiki pages:
${wiki.map(w => `## ${w.title}\n${w.content?.substring(0, 300)}`).join('\n\n')}

Return ONLY valid JSON:
{
  "overview": "2-3 sentence summary",
  "components": [{ "name": "...", "purpose": "...", "language": "..." }],
  "patterns": ["design patterns used"],
  "connections": ["how components interact"],
  "gaps": ["what's missing or should be added"],
  "markdownContent": "full markdown wiki page content for saving"
}`;

    const text = await callClaude(system, prompt, 2000);
    const clean = text.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    res.status(500).json({ error: 'AI unavailable', details: e.message });
  }
});

// 8. Wiki Summary
router.post('/wiki-summary', auth, aiLimiter, async (req, res) => {
  try {
    const { content, title } = req.body;
    const system = `You are a technical writer. Return ONLY valid JSON.`;
    const prompt = `Summarize this wiki page in 3 bullet points.
Title: ${title}
Content: ${content?.substring(0, 3000)}

Return ONLY valid JSON: { "bullets": ["point 1", "point 2", "point 3"] }`;

    const text = await callClaude(system, prompt, 500);
    const clean = text.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    res.status(500).json({ error: 'AI unavailable', details: e.message });
  }
});

// 9. PR Description Generator (Innovation)
router.post('/pr-description', auth, aiLimiter, async (req, res) => {
  try {
    const { diff, files, taskTitle } = req.body;
    const system = `You are a senior developer writing PR descriptions. Return ONLY valid JSON.`;
    const prompt = `Generate a professional pull request description.
Task: ${taskTitle || 'Not specified'}
Changed files: ${files?.join(', ') || 'Not specified'}
Diff/Changes: ${diff?.substring(0, 2000) || 'No diff provided'}

Return ONLY valid JSON:
{
  "title": "PR title",
  "summary": "what this PR does",
  "changes": ["change 1", "change 2"],
  "testingNotes": ["how to test this"],
  "breakingChanges": [],
  "markdownBody": "full PR description in markdown"
}`;

    const text = await callClaude(system, prompt, 1000);
    const clean = text.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    res.status(500).json({ error: 'AI unavailable', details: e.message });
  }
});

// 10. AI Task Name Suggestions (Innovation)
router.post('/suggest-task-name', auth, aiLimiter, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || title.trim().split(' ').length >= 5) return res.json({ suggestions: [] });
    const system = `You are a project management expert. Return ONLY valid JSON.`;
    const prompt = `The task title "${title}" is vague. Suggest 3 clearer, more actionable alternatives.
Return ONLY valid JSON: { "suggestions": ["Better title 1", "Better title 2", "Better title 3"] }
Make titles specific, action-oriented, and under 10 words.`;
    const text = await callClaude(system, prompt, 300);
    const clean = text.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    res.status(500).json({ suggestions: [] });
  }
});

module.exports = router;

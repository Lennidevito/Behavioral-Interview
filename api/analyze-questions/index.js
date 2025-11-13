export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transcript } = req.body;

    if (!transcript || !Array.isArray(transcript)) {
      return res.status(400).json({ error: 'Transcript array required' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const conversationText = transcript.map(t => 
      `${t.speaker}: ${t.text}`
    ).join('\n\n');

    const prompt = `You are an interview coach. Analyze this interview where a hiring manager is practicing STAR method follow-up questions.

TRANSCRIPT:
${conversationText}

Evaluate the interviewer's questions on:
1. Did they probe for missing STAR components (Situation, Task, Action, Result)?
2. Were questions open-ended?
3. Did they ask for specific examples and metrics?
4. Did they build on previous answers?

Provide feedback in JSON format:
{
  "overall_score": 0-100,
  "strengths": ["2-3 specific strengths"],
  "weaknesses": ["2-3 areas to improve"],
  "question_analysis": [
    {
      "question": "exact question",
      "score": 0-25,
      "feedback": "why strong/weak",
      "improvement": "how to improve"
    }
  ],
  "star_probed": {
    "situation": true/false,
    "task": true/false,
    "action": true/false,
    "result": true/false
  },
  "best_question": "strongest question",
  "next_steps": ["3 action items"]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an interview coach. Respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI error:', errorText);
      return res.status(response.status).json({ error: 'Analysis failed' });
    }

    const data = await response.json();
    const feedback = JSON.parse(data.choices[0].message.content);

    return res.status(200).json({ feedback });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

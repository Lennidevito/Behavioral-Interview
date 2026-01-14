export default async function handler(req, res) {
  // CORS headers
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
    const { message, conversationHistory } = req.body;
 
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }
 
    const apiKey = process.env.OPENAI_API_KEY;
   
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    // System Prompt für Alexa
    const systemPrompt = `You are Alexa Martinez, a marketing professional interviewing for a Senior Marketing Manager role.

BACKGROUND:
- 5 years in digital marketing
- Led team of 3 people
- Handled social media campaigns

BEHAVIOR:
- Give INCOMPLETE answers initially (leave out 1-2 STAR components)
- If interviewer asks good follow-ups, reveal missing details
- Keep responses under 50 words - be concise and conversational
- Be natural and friendly
- ONLY respond when the interviewer asks you a question

EXAMPLE:
Q: "Tell me about a challenging project"
Initial answer: "We rebranded our social media in 6 weeks. We got it done successfully."
(Missing: your specific role, detailed actions, metrics)

If they ask "What was your role?" → "I was the project lead, managing strategy and timelines"
If they ask "What does successful mean?" → "We increased engagement 47% and gained 12K followers"`;

    // Baue die Messages für die API
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Füge Conversation History hinzu falls vorhanden
    if (conversationHistory && Array.isArray(conversationHistory)) {
      messages.push(...conversationHistory);
    }

    // Füge aktuelle User Message hinzu
    messages.push({ role: 'user', content: message });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 150
      })
    });
 
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI error:', errorText);
      return res.status(response.status).json({ error: 'Chat request failed' });
    }
 
    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
 
    return res.status(200).json({ 
      response: aiResponse 
    });
 
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

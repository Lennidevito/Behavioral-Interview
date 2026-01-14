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

CRITICAL RULES - FOLLOW STRICTLY:
- Give INCOMPLETE answers initially (intentionally leave out 1-2 STAR components)
- NEVER volunteer what you left out or say things like "I didn't mention..." or "I should add..."
- NEVER self-correct or elaborate unless DIRECTLY asked a specific follow-up question
- If asked a vague question, give a vague answer
- If asked a specific question (e.g., "What was your role?" or "What metrics?"), THEN reveal that detail
- Keep ALL responses under 50 words - be conversational and natural
- Stay in character as a candidate being interviewed - don't teach or guide
- Answer ONLY what is asked - nothing more

BEHAVIOR EXAMPLES:

❌ WRONG (Don't do this):
Q: "Tell me about a project"
A: "We rebranded social media in 6 weeks. I should mention I was the lead, and we increased engagement by 47%"
→ Problem: Volunteered missing info without being asked

✅ CORRECT:
Q: "Tell me about a project"
A: "We rebranded our social media in 6 weeks. It went really well."
→ Vague answer, waits for follow-up

Then if asked: "What was your specific role?"
A: "I was the project lead, managing the strategy and timeline."
→ NOW reveal that detail because directly asked

REMEMBER: You are a candidate with incomplete answers. Make the interviewer work to extract details through follow-up questions. Never give away what you're holding back.`;

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

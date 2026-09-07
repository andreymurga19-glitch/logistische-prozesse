export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'No text provided' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY не налаштовано в змінних середовища Vercel' });
  }

  const cleaned = text.trim().slice(0, 200);

  try {
    const prompt = `Ти перекладач для німецько-українського словника з логістики/складу (для учня Fachkraft für Lagerlogistik). ` +
      `Дай ТІЛЬКИ короткий переклад українською мовою наступного німецького слова або фрази, без пояснень, без лапок, без зайвого тексту. ` +
      `Якщо це складене слово чи термін — перекладай як єдиний термін, а не дослівно по частинах. ` +
      `Слово/фраза: "${cleaned}"`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 60 }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: 'Gemini API error', details: errText });
    }

    const data = await response.json();
    const translation = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;

    if (!translation) {
      return res.status(502).json({ error: 'Порожня відповідь від Gemini' });
    }

    return res.status(200).json({ word: cleaned, translation });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}

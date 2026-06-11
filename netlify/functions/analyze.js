exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { imageBase64, imageMime, prompt } = JSON.parse(event.body);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1000,
        messages: [
          {
            role: 'system',
            content: 'Ты — профессиональный консультант-парикмахер в мужском барбершопе. Твоя задача — анализировать тип, структуру и густоту волос на фотографии и рекомендовать мужские стрижки. Всегда отвечай в заданном формате.'
          },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: 'data:' + imageMime + ';base64,' + imageBase64 } },
              { type: 'text', text: prompt }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI error:', JSON.stringify(data));
      return {
        statusCode: 500,
        body: JSON.stringify({ error: data.error?.message || 'OpenAI error' })
      };
    }

    const text = data.choices?.[0]?.message?.content || '';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

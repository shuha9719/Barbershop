// Опрашивает статус предсказания Replicate по id.
exports.handler = async (event) => {
  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'id required' }) };
  }

  try {
    const response = await fetch('https://api.replicate.com/v1/predictions/' + encodeURIComponent(id), {
      headers: { 'Authorization': 'Token ' + process.env.REPLICATE_API_KEY }
    });

    const data = await response.json();

    if (!response.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: data.detail || 'Replicate error' }) };
    }

    const status = data.status; // starting | processing | succeeded | failed | canceled

    if (status === 'succeeded') {
      const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;
      if (!outputUrl) {
        return { statusCode: 200, body: JSON.stringify({ status: 'failed', error: 'Нет изображения в ответе' }) };
      }
      // Скачиваем и конвертируем в base64 — URL Replicate временный
      const imgRes = await fetch(outputUrl);
      const buf = await imgRes.arrayBuffer();
      const b64 = 'data:image/webp;base64,' + Buffer.from(buf).toString('base64');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', b64 })
      };
    }

    if (status === 'failed' || status === 'canceled') {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'failed', error: data.error || ('Генерация прервана: ' + status) })
      };
    }

    // starting | processing — ещё ждём
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pending' })
    };

  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

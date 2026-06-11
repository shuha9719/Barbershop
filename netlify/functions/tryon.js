// Примерка стрижки через FLUX Kontext Max — лучшая модель Replicate
// для редактирования с точным сохранением лица и идентичности человека.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { imageBase64, imageMime, haircutName, haircutDescription } = JSON.parse(event.body);

    // Промпт сформулирован как ИНСТРУКЦИЯ К РЕДАКТИРОВАНИЮ (не генерации) —
    // именно так flux-kontext-max лучше всего сохраняет лицо
    const prompt =
      `Change ONLY the hairstyle of the person to "${haircutName}". ` +
      (haircutDescription ? haircutDescription + ' ' : '') +
      `The person's face must remain completely identical to the original photo: ` +
      `same eyes, nose, lips, jawline, skin tone, facial hair, age, and expression. ` +
      `Do not alter the face in any way. ` +
      `Keep the background, clothing, lighting, and body position exactly the same. ` +
      `Only modify the hair: change its length, shape, and style to match the requested haircut. ` +
      `Photorealistic result, professional barbershop quality.`;

    const imageDataUrl = 'data:' + (imageMime || 'image/jpeg') + ';base64,' + imageBase64;

    // flux-kontext-max — топовая модель для редактирования с сохранением личности
    const response = await fetch(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-max/predictions',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Token ' + process.env.REPLICATE_API_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'respond-async'
        },
        body: JSON.stringify({
          input: {
            prompt: prompt,
            input_image: imageDataUrl,
            aspect_ratio: '1:1',
            output_format: 'webp',
            output_quality: 90,
            safety_tolerance: 6,
            prompt_upsampling: true   // улучшает деталировку стрижки
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('Replicate error:', JSON.stringify(data));
      return {
        statusCode: 500,
        body: JSON.stringify({ error: data.detail || data.error || 'Replicate error' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: data.id })
    };

  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

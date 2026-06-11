exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { imageBase64, imageMime, haircutName, haircutDescription } = JSON.parse(event.body);

    const prompt = `This is a photo of a real person. Apply the "${haircutName}" men's haircut to them. ${haircutDescription || ''} Keep the person's face, skin tone, eyes, eyebrows and all facial features completely identical to the original photo. Only modify the hair on top of the head. Maintain the same lighting, background, and photo realism.`;

    const imageBuffer = Buffer.from(imageBase64, 'base64');

    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('prompt', prompt);
    form.append('n', '1');
    form.append('size', '1024x1024');
    form.append('quality', 'medium');
    form.append('input_fidelity', 'high');
    form.append('image', new Blob([imageBuffer], { type: imageMime || 'image/jpeg' }), 'photo.jpg');

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY },
      body: form
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI error:', JSON.stringify(data));
      return {
        statusCode: 500,
        body: JSON.stringify({ error: data.error?.message || 'OpenAI error' })
      };
    }

    const imageData = data.data?.[0];
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: imageData?.url || null,
        b64: imageData?.b64_json ? 'data:image/png;base64,' + imageData.b64_json : null
      })
    };

  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

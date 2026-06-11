exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { imageBase64, imageMime, styles } = JSON.parse(event.body);

    if (!Array.isArray(styles) || styles.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'styles array required' }) };
    }

    const list = styles.slice(0, 3).map((s, i) =>
      `Panel ${i + 1}: "${s.name}" haircut. ${s.description || ''}`
    ).join('\n');

    const prompt = `This is a photo of a real person. Create a single professional barbershop lookbook image: ${styles.length} equal vertical panels side by side on a clean light studio background. Every panel shows the SAME person from the photo — face, skin tone, eyes, eyebrows, facial features and expression must stay completely identical to the original photo in all panels. The ONLY difference between panels is the hairstyle:
${list}
Front-facing portrait framing (head and shoulders) in each panel, identical soft studio lighting, photorealistic, like a barbershop "choose your style" poster. No text, no labels, no watermarks.`;

    const imageBuffer = Buffer.from(imageBase64, 'base64');

    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('prompt', prompt);
    form.append('n', '1');
    form.append('size', '1536x1024');
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

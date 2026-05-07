const axios = require('axios');
const fs = require('fs');

const imageBase64 = fs.readFileSync('class-max.png').toString('base64');
// The Token (JWT) from earlier
const TOKEN = 'eyJhbGciOiJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA5LyIsInR5cCI6IkpXVCJ9.eyJpcCI6IjEyOC4xMjQuMjExLjExOCIsImlhdCI6MTc1MDg2NzE0NCwianRpIjoiNDA0Mjk1MDU3NjU0MTE0MTcwNCJ9.PL4GhsCk8RkqntjlD-RN5a6-gyBPXbJqqL8pFEfBxmM';
// The App Key
const APP_KEY = 'sk-cp-qygO0VqxtokkcgpVD8-1cOlQrZ9XSYtiwSEIwaIe5hSnHqbOU2fOxPEgd2BdA1cei_f6hPlBmmGKXXOA_q986KIUWAGl7pqAg53UScjqodYTWnSvBrknk_M';

async function test(name, url, payload, auth) {
  console.log(`\n=== ${name} ===`);
  try {
    const res = await axios.post(url, payload, {
      headers: { 'Authorization': `Bearer ${auth}`, 'Content-Type': 'application/json' }
    });
    console.log('✓', JSON.stringify(res.data).substring(0, 300));
    return true;
  } catch (e) {
    console.log('✗', e.response?.status, JSON.stringify(e.response?.data || e.message).substring(0, 300));
    return false;
  }
}

async function main() {
  // Try with TOKEN on VLM
  await test('VLM with Token', 'https://api.minimax.chat/v1/coding_plan/vlm',
    { model: 'MiniMax-Image-01', messages: [{ role: 'user', content: 'hi' }] },
    TOKEN
  );
  
  // Try with APP_KEY on VLM  
  await test('VLM with App Key', 'https://api.minimax.chat/v1/coding_plan/vlm',
    { model: 'MiniMax-Image-01', messages: [{ role: 'user', content: 'hi' }] },
    APP_KEY
  );

  // Try text endpoint with TOKEN (known to work for text)
  await test('Text with Token', 'https://api.minimax.chat/v1/text/chatcompletion_v2',
    { model: 'MiniMax-Text-01', messages: [{ role: 'user', content: 'hi' }] },
    TOKEN
  );
}

main();

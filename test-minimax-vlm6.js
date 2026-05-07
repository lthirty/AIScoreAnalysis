const axios = require('axios');
const fs = require('fs');

const imageBase64 = fs.readFileSync('class-max.png').toString('base64');
const APP_KEY = 'sk-cp-qygO0VqxtokkcgpVD8-1cOlQrZ9XSYtiwSEIwaIe5hSnHqbOU2fOxPEgd2BdA1cei_f6hPlBmmGKXXOA_q986KIUWAGl7pqAg53UScjqodYTWnSvBrknk_M';

async function test(path, payload, headers = {}) {
  console.log(`\n=== POST ${path} ===`);
  try {
    const res = await axios.post(`https://api.minimax.chat${path}`, payload, {
      headers: { 'Authorization': `Bearer ${APP_KEY}`, 'Content-Type': 'application/json', ...headers }
    });
    console.log('✓', JSON.stringify(res.data).substring(0, 300));
    return true;
  } catch (e) {
    console.log('✗', e.response?.status, JSON.stringify(e.response?.data || e.message).substring(0, 300));
    return false;
  }
}

async function main() {
  // Try different endpoint paths
  await test('/v1/coding_plan/vlm', { messages: [{ role: 'user', content: 'hi' }] });
  await test('/v1/vlm', { messages: [{ role: 'user', content: 'hi' }] });
  
  // Try with Group-ID header (some APIs require this)
  await test('/v1/coding_plan/vlm', 
    { messages: [{ role: 'user', content: 'hi' }] },
    { 'X-Group-Id': '123' }
  );
  
  // Try without Authorization header
  console.log('\n=== No Auth Header ===');
  try {
    const res = await axios.post('https://api.minimax.chat/v1/coding_plan/vlm', 
      { messages: [{ role: 'user', content: 'hi' }] },
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log('✓', JSON.stringify(res.data).substring(0, 200));
  } catch (e) {
    console.log('✗', e.response?.status, JSON.stringify(e.response?.data || e.message).substring(0, 200));
  }
}

main();

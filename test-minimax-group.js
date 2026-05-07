const axios = require('axios');
const APP_KEY = 'sk-cp-qygO0VqxtokkcgpVD8-1cOlQrZ9XSYtiwSEIwaIe5hSnHqbOU2fOxPEgd2BdA1cei_f6hPlBmmGKXXOA_q986KIUWAGl7pqAg53UScjqodYTWnSvBrknk_M';

async function test(url, payload, headers = {}) {
  try {
    const res = await axios.post(url, payload, {
      headers: { 'Authorization': `Bearer ${APP_KEY}`, 'Content-Type': 'application/json', ...headers }
    });
    console.log('✓', JSON.stringify(res.data).substring(0, 200));
    return true;
  } catch (e) {
    console.log('✗', e.response?.status, JSON.stringify(e.response?.data || e.message).substring(0, 300));
    return false;
  }
}

async function main() {
  console.log('=== Testing MiniMax VLM with different Group-Id ===\n');
  
  // Test with different Group-Id headers
  await test('https://api.minimax.chat/v1/coding_plan/vlm', 
    { model: 'MiniMax-Image-01', messages: [{ role: 'user', content: 'hi' }] },
    { 'X-Group-Id': '0' }
  );
  
  await test('https://api.minimax.chat/v1/coding_plan/vlm', 
    { messages: [{ role: 'user', content: 'hi' }] },
    { 'Group-Id': '0' }
  );
  
  // Try group_id in body
  await test('https://api.minimax.chat/v1/coding_plan/vlm', 
    { group_id: '0', messages: [{ role: 'user', content: 'hi' }] }
  );
}

main();

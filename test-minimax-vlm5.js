const axios = require('axios');
const fs = require('fs');

const imageBase64 = fs.readFileSync('class-max.png').toString('base64');
const APP_KEY = 'sk-cp-qygO0VqxtokkcgpVD8-1cOlQrZ9XSYtiwSEIwaIe5hSnHqbOU2fOxPEgd2BdA1cei_f6hPlBmmGKXXOA_q986KIUWAGl7pqAg53UScjqodYTWnSvBrknk_M';

async function testSimple() {
  console.log('=== Test 1: Text only ===');
  try {
    const res = await axios.post('https://api.minimax.chat/v1/coding_plan/vlm', {
      messages: [{ role: 'user', content: 'Hello, respond with OK' }]
    }, {
      headers: { 'Authorization': `Bearer ${APP_KEY}`, 'Content-Type': 'application/json' }
    });
    console.log('✓', JSON.stringify(res.data).substring(0, 200));
  } catch (e) {
    console.log('✗', e.response?.status, JSON.stringify(e.response?.data || e.message).substring(0, 200));
  }
}

async function testWithImage() {
  console.log('\n=== Test 2: With image (no model field) ===');
  try {
    const res = await axios.post('https://api.minimax.chat/v1/coding_plan/vlm', {
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
          { type: 'text', text: 'Describe this image' }
        ]
      }]
    }, {
      headers: { 'Authorization': `Bearer ${APP_KEY}`, 'Content-Type': 'application/json' }
    });
    console.log('✓', JSON.stringify(res.data).substring(0, 200));
  } catch (e) {
    console.log('✗', e.response?.status, JSON.stringify(e.response?.data || e.message).substring(0, 200));
  }
}

async function testWithUrl() {
  console.log('\n=== Test 3: With image URL ===');
  try {
    const res = await axios.post('https://api.minimax.chat/v1/coding_plan/vlm', {
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: 'https://httpbin.org/image/png' } },
          { type: 'text', text: 'Describe this image' }
        ]
      }]
    }, {
      headers: { 'Authorization': `Bearer ${APP_KEY}`, 'Content-Type': 'application/json' }
    });
    console.log('✓', JSON.stringify(res.data).substring(0, 200));
  } catch (e) {
    console.log('✗', e.response?.status, JSON.stringify(e.response?.data || e.message).substring(0, 200));
  }
}

async function main() {
  await testSimple();
  await testWithImage();
  await testWithUrl();
}

main();

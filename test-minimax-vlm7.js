const axios = require('axios');
const fs = require('fs');

const imageBase64 = fs.readFileSync('class-max.png').toString('base64');
const APP_KEY = 'sk-cp-qygO0VqxtokkcgpVD8-1cOlQrZ9XSYtiwSEIwaIe5hSnHqbOU2fOxPEgd2BdA1cei_f6hPlBmmGKXXOA_q986KIUWAGl7pqAg53UScjqodYTWnSvBrknk_M';

async function test(payload) {
  try {
    const res = await axios.post('https://api.minimax.chat/v1/coding_plan/vlm', payload, {
      headers: { 'Authorization': `Bearer ${APP_KEY}`, 'Content-Type': 'application/json' }
    });
    console.log('✓ Response:', JSON.stringify(res.data).substring(0, 300));
    return true;
  } catch (e) {
    console.log('✗', JSON.stringify(e.response?.data || e.message).substring(0, 300));
    return false;
  }
}

async function main() {
  // Different payload structures
  console.log('=== Test 1: model string only ===');
  await test({ model: 'MiniMax-Image-01', messages: [{ role: 'user', content: 'hi' }] });

  console.log('\n=== Test 2: With image data ===');
  await test({ 
    model: 'MiniMax-Image-01', 
    messages: [{ 
      role: 'user', 
      content: 'What is in this image?' 
    }],
    images: [{ type: 'base64', data: imageBase64 }]
  });

  console.log('\n=== Test 3: Different content type ===');
  await test({ 
    model: 'MiniMax-Image-01', 
    messages: [{ 
      role: 'user', 
      content: [
        { type: 'text', text: 'What is in this image?' }
      ]
    }],
    images: [{ type: 'base64', data: imageBase64 }]
  });

  console.log('\n=== Test 4: With temperature ===');
  await test({ 
    model: 'MiniMax-Image-01', 
    temperature: 0.5,
    messages: [{ role: 'user', content: 'hi' }]
  });
}

main();

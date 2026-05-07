const axios = require('axios');
const fs = require('fs');

const imageBase64 = fs.readFileSync('class-max.png').toString('base64');

// Try with the App Key from App.jsx
const APP_KEY = 'sk-cp-qygO0VqxtokkcgpVD8-1cOlQrZ9XSYtiwSEIwaIe5hSnHqbOU2fOxPEgd2BdA1cei_f6hPlBmmGKXXOA_q986KIUWAGl7pqAg53UScjqodYTWnSvBrknk_M';

async function testVLM() {
  console.log('=== Testing MiniMax /v1/coding_plan/vlm with App Key ===\n');
  
  try {
    const res = await axios.post('https://api.minimax.chat/v1/coding_plan/vlm', {
      model: 'MiniMax-Image-01',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
          { type: 'text', text: '请提取图片中的成绩数据，以JSON数组格式返回，格式如[{"subject":"语文","score":85}]。只返回JSON。' }
        ]
      }]
    }, {
      headers: { 
        'Authorization': `Bearer ${APP_KEY}`, 
        'Content-Type': 'application/json'
      }
    });
    console.log('✓ Success!');
    console.log('Response:', JSON.stringify(res.data).substring(0, 500));
  } catch (e) {
    console.log('✗ Error:', e.response?.status);
    console.log(JSON.stringify(e.response?.data || e.message).substring(0, 500));
  }
}

testVLM();

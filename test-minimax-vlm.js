const axios = require('axios');
const fs = require('fs');

const imageBase64 = fs.readFileSync('class-max.png').toString('base64');

async function testVLM() {
  console.log('=== Testing MiniMax /v1/coding_plan/vlm ===\n');
  
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
        'Authorization': 'Bearer eyJhbGciOiJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA5LyIsInR5cCI6IkpXVCJ9.eyJpcCI6IjEyOC4xMjQuMjExLjExOCIsImlhdCI6MTc1MDg2NzE0NCwianRpIjoiNDA0Mjk1MDU3NjU0MTE0MTcwNCJ9.PL4GhsCk8RkqntjlD-RN5a6-gyBPXbJqqL8pFEfBxmM', 
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

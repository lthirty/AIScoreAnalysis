const axios = require('axios');
const fs = require('fs');

const imageBase64 = fs.readFileSync('class-max.png').toString('base64');
const APP_KEY = 'sk-cp-qygO0VqxtokkcgpVD8-1cOlQrZ9XSYtiwSEIwaIe5hSnHqbOU2fOxPEgd2BdA1cei_f6hPlBmmGKXXOA_q986KIUWAGl7pqAg53UScjqodYTWnSvBrknk_M';

async function testVLM(modelName) {
  console.log(`\n=== Testing: ${modelName} ===`);
  try {
    const res = await axios.post('https://api.minimax.chat/v1/coding_plan/vlm', {
      model: modelName,
      messages: [{
        role: 'user',
        content: `请提取图片中的成绩数据，以JSON数组格式返回，格式如[{"subject":"语文","score":85}]。只返回JSON。Image: data:image/png;base64,${imageBase64}`
      }]
    }, {
      headers: { 
        'Authorization': `Bearer ${APP_KEY}`, 
        'Content-Type': 'application/json'
      }
    });
    console.log('✓ Success!');
    console.log(JSON.stringify(res.data).substring(0, 300));
    return true;
  } catch (e) {
    console.log('✗', e.response?.status, JSON.stringify(e.response?.data || e.message).substring(0, 200));
    return false;
  }
}

async function main() {
  // Test with empty model (default)
  await testVLM('');
  await testVLM(' ');
  await testVLM('MiniMax');
}

main();

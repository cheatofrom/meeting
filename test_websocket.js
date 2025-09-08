// 简单的WebSocket连接测试脚本
const WebSocket = require('ws');

const testUrls = [
  'ws://192.168.1.66:10095/',
  'wss://192.168.1.66:10095/',
  'ws://localhost:10095/',
  'wss://localhost:10095/'
];

function testWebSocketConnection(url) {
  return new Promise((resolve) => {
    console.log(`\n测试连接: ${url}`);
    
    const ws = new WebSocket(url, {
      rejectUnauthorized: false // 忽略SSL证书错误
    });
    
    const timeout = setTimeout(() => {
      ws.terminate();
      resolve({ url, status: 'timeout', error: '连接超时' });
    }, 5000);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      console.log(`✓ ${url} - 连接成功`);
      ws.close();
      resolve({ url, status: 'success' });
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.log(`✗ ${url} - 连接失败:`, error.message);
      resolve({ url, status: 'error', error: error.message });
    });
    
    ws.on('close', (code, reason) => {
      console.log(`${url} - 连接关闭, code: ${code}, reason: ${reason}`);
    });
  });
}

async function runTests() {
  console.log('开始WebSocket连接测试...');
  
  for (const url of testUrls) {
    const result = await testWebSocketConnection(url);
    if (result.status === 'success') {
      console.log(`\n推荐使用: ${result.url}`);
      break;
    }
  }
  
  console.log('\n测试完成');
}

runTests().catch(console.error);
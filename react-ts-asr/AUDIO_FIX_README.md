# 音频采样率修复说明

## 问题描述
React版本的ASR应用能够连接WebSocket服务器并接收音频，但识别结果不正确。经过分析发现问题出在音频采样率处理上。

## 问题根因
- **HTML5版本**: 使用 `Recorder.SampleData(array_48k, bufferSampleRate, 16000).data` 将音频从原始采样率重采样到16kHz
- **React版本**: 直接使用原始音频数据，没有进行重采样处理
- **ASR服务器**: 期望接收16kHz采样率的音频数据

## 修复方案
在React版本的 `handleAudioProcess` 函数中添加了重采样逻辑：

```typescript
// 重采样到16kHz（与HTML5版本保持一致）
let processedBuffer = buffer;
if (bufferSampleRate !== 16000) {
  console.log('🔄 重采样音频数据从', bufferSampleRate, 'Hz 到 16000Hz');
  processedBuffer = AudioUtils.resampleAudio(buffer, bufferSampleRate, 16000);
  console.log('✅ 重采样完成，原始长度:', buffer.length, '重采样后长度:', processedBuffer.length);
}
```

## 测试步骤
1. 打开React ASR应用 (https://localhost:5173/)
2. 连接到WebSocket服务器
3. 开始录音测试
4. 查看浏览器控制台，应该能看到重采样相关的日志信息
5. 验证ASR识别结果是否正确

## 预期效果
- 浏览器控制台会显示重采样日志（如果原始采样率不是16kHz）
- ASR识别准确率应该显著提升
- 音频数据格式与HTML5版本保持一致

## 技术细节
- 使用线性插值算法进行重采样
- 保持与HTML5版本相同的chunk_size (960)
- 确保音频数据格式为Int16Array
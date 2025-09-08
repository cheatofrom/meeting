# 音频质量修复说明

## 问题分析

通过对比HTML5版本和React版本的实现，发现React版本存在以下关键问题导致音频失真：

### 1. 采样率处理问题
- **问题**：React版本直接使用AudioContext的默认采样率（通常48000Hz），但没有正确重采样到目标采样率（16000Hz）
- **HTML5版本**：使用`Recorder.SampleData()`方法进行正确的重采样处理
- **修复**：添加了`resampleAudio()`方法，使用线性插值进行采样率转换

### 2. 音频数据转换问题
- **问题**：16位PCM转换算法不准确，使用了不对称的范围转换
- **原代码**：`s < 0 ? s * 0x8000 : s * 0x7FFF`
- **修复**：使用对称的转换`Math.round(s * 32767)`

### 3. 音频上下文配置问题
- **问题**：强制设置AudioContext采样率可能导致浏览器兼容性问题
- **修复**：使用浏览器默认采样率，然后通过软件重采样到目标采样率

## 修复内容

### 1. 添加音频重采样功能
```typescript
private resampleAudio(audioData: Float32Array, srcSampleRate: number, targetSampleRate: number): Float32Array {
  if (srcSampleRate === targetSampleRate) {
    return audioData;
  }
  
  const ratio = srcSampleRate / targetSampleRate;
  const newLength = Math.round(audioData.length / ratio);
  const result = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, audioData.length - 1);
    const fraction = srcIndex - srcIndexFloor;
    
    // 线性插值
    result[i] = audioData[srcIndexFloor] * (1 - fraction) + audioData[srcIndexCeil] * fraction;
  }
  
  return result;
}
```

### 2. 修复PCM转换算法
```typescript
private floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    // 限制在-1到1范围内
    const s = Math.max(-1, Math.min(1, input[i]));
    // 转换为16位整数，使用正确的范围
    output[i] = Math.round(s * 32767);
  }
  return output;
}
```

### 3. 优化音频处理流程
- 使用浏览器默认采样率创建AudioContext
- 在音频处理回调中进行重采样
- 正确计算重采样后的时长和采样率

## 预期效果

修复后的React版本应该能够：
1. 生成与HTML5版本相同质量的音频文件
2. 正确处理不同采样率之间的转换
3. 避免音频失真和噪音问题
4. 保持与原有功能的完全兼容性

## 测试建议

1. 录制相同内容的音频，对比HTML5版本和React版本的音质
2. 检查生成的WAV文件是否可以正常播放
3. 验证音频时长和采样率是否正确
4. 测试不同浏览器的兼容性
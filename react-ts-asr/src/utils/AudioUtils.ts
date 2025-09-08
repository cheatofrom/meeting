/**
 * Copyright FunASR (https://github.com/alibaba-damo-academy/FunASR). All Rights
 * Reserved. MIT License  (https://opensource.org/licenses/MIT)
 */

export class AudioUtils {
  /**
   * 将PCM数据转换为WAV格式
   * @param pcmData PCM数据
   * @param sampleRate 采样率
   * @param numChannels 通道数
   * @param bitDepth 位深度
   * @returns WAV格式的ArrayBuffer
   */
  public static pcmToWav(pcmData: Int16Array, sampleRate: number = 16000, numChannels: number = 1, bitDepth: number = 16): ArrayBuffer {
    const dataLength = pcmData.length * (bitDepth / 8);
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    // RIFF标识
    this.writeString(view, 0, 'RIFF');
    // 文件长度
    view.setUint32(4, 36 + dataLength, true);
    // WAVE标识
    this.writeString(view, 8, 'WAVE');
    // fmt子块标识
    this.writeString(view, 12, 'fmt ');
    // 子块长度
    view.setUint32(16, 16, true);
    // 音频格式（PCM = 1）
    view.setUint16(20, 1, true);
    // 通道数
    view.setUint16(22, numChannels, true);
    // 采样率
    view.setUint32(24, sampleRate, true);
    // 字节率 = 采样率 * 通道数 * 位深度 / 8
    view.setUint32(28, sampleRate * numChannels * bitDepth / 8, true);
    // 块对齐 = 通道数 * 位深度 / 8
    view.setUint16(32, numChannels * bitDepth / 8, true);
    // 位深度
    view.setUint16(34, bitDepth, true);
    // data子块标识
    this.writeString(view, 36, 'data');
    // 数据长度
    view.setUint32(40, dataLength, true);

    // 写入PCM数据
    const offset = 44;
    for (let i = 0; i < pcmData.length; i++) {
      view.setInt16(offset + i * 2, pcmData[i], true);
    }

    return buffer;
  }

  /**
   * 将WAV文件解析为PCM数据
   * @param wavArrayBuffer WAV文件的ArrayBuffer
   * @returns 包含PCM数据和采样率的对象
   */
  public static wavToPcm(wavArrayBuffer: ArrayBuffer): { pcmData: Int16Array, sampleRate: number } {
    const view = new DataView(wavArrayBuffer);
    
    // 检查RIFF标识
    const riff = this.readString(view, 0, 4);
    if (riff !== 'RIFF') {
      throw new Error('无效的WAV文件: 缺少RIFF标识');
    }
    
    // 检查WAVE标识
    const wave = this.readString(view, 8, 4);
    if (wave !== 'WAVE') {
      throw new Error('无效的WAV文件: 缺少WAVE标识');
    }
    
    // 查找data子块
    let offset = 12;
    let dataOffset = 0;
    let dataLength = 0;
    let sampleRate = 0;
    
    while (offset < view.byteLength) {
      const chunkId = this.readString(view, offset, 4);
      const chunkSize = view.getUint32(offset + 4, true);
      
      if (chunkId === 'fmt ') {
        // 获取采样率
        sampleRate = view.getUint32(offset + 12, true);
      } else if (chunkId === 'data') {
        dataOffset = offset + 8;
        dataLength = chunkSize;
        break;
      }
      
      offset += 8 + chunkSize;
    }
    
    if (dataOffset === 0) {
      throw new Error('无效的WAV文件: 缺少data子块');
    }
    
    // 提取PCM数据
    const pcmData = new Int16Array(dataLength / 2);
    for (let i = 0; i < pcmData.length; i++) {
      pcmData[i] = view.getInt16(dataOffset + i * 2, true);
    }
    
    return { pcmData, sampleRate };
  }

  /**
   * 将字符串写入DataView
   */
  private static writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * 从DataView读取字符串
   */
  private static readString(view: DataView, offset: number, length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += String.fromCharCode(view.getUint8(offset + i));
    }
    return result;
  }

  /**
   * 重采样音频数据
   * @param audioData 原始音频数据
   * @param originalSampleRate 原始采样率
   * @param targetSampleRate 目标采样率
   * @returns 重采样后的音频数据
   */
  public static resampleAudio(audioData: Int16Array, originalSampleRate: number, targetSampleRate: number): Int16Array {
    if (originalSampleRate === targetSampleRate) {
      return audioData;
    }
    
    const ratio = originalSampleRate / targetSampleRate;
    const newLength = Math.round(audioData.length / ratio);
    const result = new Int16Array(newLength);
    
    for (let i = 0; i < newLength; i++) {
      const position = i * ratio;
      const index = Math.floor(position);
      const fraction = position - index;
      
      // 线性插值
      if (index + 1 < audioData.length) {
        result[i] = Math.round((1 - fraction) * audioData[index] + fraction * audioData[index + 1]);
      } else {
        result[i] = audioData[index];
      }
    }
    
    return result;
  }
}
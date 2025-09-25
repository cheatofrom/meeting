/**
 * Copyright FunASR (https://github.com/alibaba-damo-academy/FunASR). All Rights
 * Reserved. MIT License  (https://opensource.org/licenses/MIT)
 */

export interface AudioRecorderConfig {
  onProcess?: (buffer: Int16Array, powerLevel: number, bufferDuration: number, bufferSampleRate: number) => void;
  sampleRate?: number;
  bitRate?: number;
  type?: string;
}

export interface RecordingResult {
  audioData: Int16Array;
  duration: number;
  sampleRate: number;
  blob?: Blob;
}

export class AudioRecorderService {
  // private _recorder: any; // 暂时注释掉未使用的字段
  private isRecording: boolean = false;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioInput: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private config: AudioRecorderConfig;
  private recordedData: Int16Array[] = []; // 存储录音数据
  private startTime: number = 0; // 录音开始时间

  constructor(config: AudioRecorderConfig = {}) {
    this.config = {
      sampleRate: 16000,
      bitRate: 16,
      type: 'pcm',
      onProcess: () => {},
      ...config
    };
  }

  public async start(): Promise<boolean> {
    if (this.isRecording) return true;

    try {
      // 初始化录音数据收集
      this.recordedData = [];
      this.startTime = Date.now();
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('浏览器不支持录音功能');
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // 使用浏览器默认采样率，通常是48000Hz
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      this.audioInput = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => this.onAudioProcess(e);
      
      this.audioInput.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      this.isRecording = true;
      return true;
    } catch (error) {
      console.error('AudioRecorder: 启动录音失败:', error);
      return false;
    }
  }

  public getRecordingState(): boolean {
    return this.isRecording;
  }

  public stop(): RecordingResult | null {
    if (!this.isRecording) {
      return null;
    }

    try {
      this.isRecording = false;
      
      // 计算录音时长
      const duration = (Date.now() - this.startTime) / 1000;
      
      // 合并所有录音数据
      const totalLength = this.recordedData.reduce((sum, chunk) => sum + chunk.length, 0);
      const mergedData = new Int16Array(totalLength);
      let offset = 0;
      for (const chunk of this.recordedData) {
        mergedData.set(chunk, offset);
        offset += chunk.length;
      }
      
      // 使用目标采样率创建WAV格式的Blob
      const sampleRate = this.config.sampleRate || 16000;
      const blob = this.createWavBlob(mergedData, sampleRate);
      
      return {
        audioData: mergedData,
        duration,
        sampleRate,
        blob
      };
    } finally {
      // 清理资源
      if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
      }
      if (this.audioInput) {
        this.audioInput.disconnect();
        this.audioInput = null;
      }
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
    }
  }

  private onAudioProcess(e: AudioProcessingEvent): void {
    if (!this.isRecording) return;
    
    const inputBuffer = e.inputBuffer;
    const inputData = inputBuffer.getChannelData(0);
    const srcSampleRate = inputBuffer.sampleRate;
    const targetSampleRate = this.config.sampleRate || 16000;
    
    // 重采样到目标采样率
    const resampledData = this.resampleAudio(inputData, srcSampleRate, targetSampleRate);
    
    // 转换为16位PCM
    const pcmData = this.floatTo16BitPCM(resampledData);
    
    // 存储录音数据
    this.recordedData.push(pcmData);
    
    // 计算音量
    const powerLevel = this.calculatePowerLevel(inputData);
    
    // 调用回调函数
    if (this.config.onProcess) {
      this.config.onProcess(
        pcmData,
        powerLevel,
        inputBuffer.duration * (targetSampleRate / srcSampleRate),
        targetSampleRate
      );
    }
  }

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

  private calculatePowerLevel(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sum / buffer.length);
    return Math.max(0, Math.min(1, rms * 10)); // 归一化到0-1范围
  }

  // 音频重采样方法，参考HTML5版本的实现
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

  private createWavBlob(audioData: Int16Array, sampleRate: number): Blob {
    const length = audioData.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    
    // WAV文件头
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // 写入音频数据
    let offset = 44;
    for (let i = 0; i < length; i++) {
      view.setInt16(offset, audioData[i], true);
      offset += 2;
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }
}
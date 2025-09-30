/**
 * Copyright FunASR (https://github.com/alibaba-damo-academy/FunASR). All Rights
 * Reserved. MIT License  (https://opensource.org/licenses/MIT)
 */

export interface SystemAudioRecorderConfig {
  onProcess?: (buffer: Int16Array, powerLevel: number, bufferDuration: number, bufferSampleRate: number) => void;
  sampleRate?: number;
  bitRate?: number;
  type?: string;
}

export interface SystemRecordingResult {
  audioData: Int16Array;
  duration: number;
  sampleRate: number;
  blob?: Blob;
}

export class SystemAudioRecorderService {
  private isRecording: boolean = false;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioInput: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private config: SystemAudioRecorderConfig;
  private recordedData: Int16Array[] = []; // 存储录音数据
  private startTime: number = 0; // 录音开始时间

  constructor(config: SystemAudioRecorderConfig = {}) {
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
      
      console.log('SystemAudioRecorder: 开始初始化系统录音...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        console.error('SystemAudioRecorder: 浏览器不支持 getDisplayMedia API');
        throw new Error('浏览器不支持系统录音功能');
      }

      console.log('SystemAudioRecorder: 请求系统音频权限...');
      
      // 使用 getDisplayMedia 录制系统音频
      this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: 1,
          height: 1,
          frameRate: 1
        },
        audio: {
          channelCount: 2,
          noiseSuppression: false,
          autoGainControl: false,
          echoCancellation: false
        } as any // 使用 any 类型避免 TypeScript 类型检查问题
      });

      console.log('SystemAudioRecorder: 成功获取媒体流', this.mediaStream);

      // 检查是否成功获取音频轨道
      const audioTracks = this.mediaStream.getAudioTracks();
      console.log('SystemAudioRecorder: 音频轨道数量:', audioTracks.length);
      
      if (audioTracks.length === 0) {
        console.error('SystemAudioRecorder: 未获取到音频轨道');
        throw new Error('未能获取系统音频轨道，请确保选择了包含音频的屏幕或应用');
      }

      // 监听轨道结束事件
      audioTracks.forEach((track, index) => {
        console.log(`SystemAudioRecorder: 音频轨道 ${index}:`, track.label, track.enabled);
        track.onended = () => {
          console.log('SystemAudioRecorder: 音频轨道已结束');
          this.stop();
        };
      });

      // 使用浏览器默认采样率，通常是48000Hz
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('SystemAudioRecorder: AudioContext 采样率:', this.audioContext.sampleRate);

      this.audioInput = this.audioContext.createMediaStreamSource(this.mediaStream);
      // 使用更小的缓冲区以提高实时性，与麦克风录音保持一致
      this.processor = this.audioContext.createScriptProcessor(1024, 1, 1);
      
      this.processor.onaudioprocess = (e) => this.onAudioProcess(e);
      
      this.audioInput.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      this.isRecording = true;
      console.log('SystemAudioRecorder: 系统录音启动成功');
      return true;
    } catch (error) {
      console.error('SystemAudioRecorder: 启动系统录音失败:', error);
      
      // 清理可能已创建的资源
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
      
      return false;
    }
  }

  public getRecordingState(): boolean {
    return this.isRecording;
  }

  public stop(): SystemRecordingResult | null {
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

  private onAudioProcess(event: AudioProcessingEvent): void {
    if (!this.isRecording) return;

    const inputBuffer = event.inputBuffer;
    const srcSampleRate = this.audioContext?.sampleRate || 48000;
    const targetSampleRate = this.config.sampleRate || 16000;
    
    // 直接使用第一个通道的数据，与麦克风录音保持一致
    const inputData = inputBuffer.getChannelData(0);

    // 重采样到目标采样率
    const resampledData = this.resampleAudio(inputData, srcSampleRate, targetSampleRate);
    
    // 转换为16位PCM
    const pcmData = this.floatTo16BitPCM(resampledData);
    
    // 存储录音数据
    this.recordedData.push(pcmData);
    
    // 计算音量
    const powerLevel = this.calculateVolume(resampledData);
    
    // 调用回调函数 - 使用与麦克风录音相同的持续时间计算方式
    if (this.config.onProcess) {
      // 使用与麦克风录音相同的持续时间计算方式
      const bufferDuration = inputBuffer.duration * (targetSampleRate / srcSampleRate);
      this.config.onProcess(
        pcmData,
        powerLevel,
        bufferDuration,
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

  private calculateVolume(audioData: Float32Array): number {
    if (audioData.length === 0) return 0;
    
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    
    const rms = Math.sqrt(sum / audioData.length);
    return Math.min(rms * 10, 1); // 归一化到0-1范围
  }

  private createWavBlob(audioData: Int16Array, sampleRate: number): Blob {
    const buffer = this.pcmToWav(audioData, sampleRate);
    return new Blob([buffer], { type: 'audio/wav' });
  }

  private pcmToWav(audioData: Int16Array, sampleRate: number): ArrayBuffer {
    const dataLength = audioData.length * 2;
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
    view.setUint16(22, 1, true);
    // 采样率
    view.setUint32(24, sampleRate, true);
    // 字节率 = 采样率 * 通道数 * 位深度 / 8
    view.setUint32(28, sampleRate * 2, true);
    // 块对齐 = 通道数 * 位深度 / 8
    view.setUint16(32, 2, true);
    // 位深度
    view.setUint16(34, 16, true);
    // data子块标识
    this.writeString(view, 36, 'data');
    // 数据长度
    view.setUint32(40, dataLength, true);

    // 写入PCM数据
    const offset = 44;
    for (let i = 0; i < audioData.length; i++) {
      view.setInt16(offset + i * 2, audioData[i], true);
    }

    return buffer;
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
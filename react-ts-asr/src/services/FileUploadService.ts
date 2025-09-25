export interface FileUploadResult {
  success: boolean;
  data?: Array<{
    text: string;
    start_time?: number;
    end_time?: number;
    confidence?: number;
  }>;
  total_segments?: number;
  error?: string;
}

export class FileUploadService {
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string = 'https://localhost:10095') {
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * 更新API服务器地址
   */
  updateApiUrl(url: string) {
    this.apiBaseUrl = url;
  }

  /**
   * 上传音频文件进行识别
   */
  async uploadAndRecognize(
    file: File,
    options: {
      batch_size_s?: number;
      hotword?: string;
    } = {}
  ): Promise<FileUploadResult> {
    try {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('batch_size_s', (options.batch_size_s || 300).toString());
      formData.append('hotword', options.hotword || '');

      const response = await fetch(`${this.apiBaseUrl}/api/recognize`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 检查API服务器健康状态
   */
  async checkHealth(): Promise<{ status: string; model_loaded: boolean }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/health`);
      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * 将音频Blob转换为File对象
   */
  static blobToFile(blob: Blob, filename: string = 'audio.wav'): File {
    return new File([blob], filename, { type: blob.type });
  }

  /**
   * 验证音频文件格式
   */
  static validateAudioFile(file: File): { valid: boolean; error?: string } {
    const validTypes = [
      'audio/wav', 'audio/wave', 'audio/x-wav',
      'audio/mpeg', 'audio/mp3',
      'audio/mp4', 'audio/m4a',
      'audio/aac',
      'audio/flac',
      'audio/ogg'
    ];

    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: `不支持的音频格式: ${file.type}。支持的格式: WAV, MP3, MP4, M4A, AAC, FLAC, OGG`
      };
    }

    // 检查文件大小 (限制为100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `文件过大: ${(file.size / 1024 / 1024).toFixed(1)}MB。最大支持100MB`
      };
    }

    return { valid: true };
  }
}
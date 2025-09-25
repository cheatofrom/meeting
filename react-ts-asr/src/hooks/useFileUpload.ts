import { App } from 'antd';
import type { RecordingResult } from '../services/AudioRecorderService';
import { AudioUtils } from '../utils/AudioUtils';

export const useFileUpload = () => {
  const { message: messageApi } = App.useApp();

  const createWavBlob = (pcmData: Int16Array, sampleRate: number): Blob => {
    const length = pcmData.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);

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

    let offset = 44;
    for (let i = 0; i < length; i++) {
      view.setInt16(offset, pcmData[i], true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const processUploadedFile = async (
    _file: File,
    pcmData: Int16Array,
    audioUrl: string,
    setRecordedAudio: (audio: RecordingResult) => void,
    setAudioUrl: (url: string) => void
  ) => {
    try {
      const wavBlob = createWavBlob(pcmData, 16000);

      const uploadResult: RecordingResult = {
        audioData: pcmData,
        blob: wavBlob,
        duration: pcmData.length / 16000,
        sampleRate: 16000
      };

      setRecordedAudio(uploadResult);

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      const newAudioUrl = URL.createObjectURL(wavBlob);
      setAudioUrl(newAudioUrl);

      messageApi.success(`音频文件上传成功！时长: ${uploadResult.duration.toFixed(1)}秒`);
    } catch (error) {
      console.error('处理文件失败:', error);
      messageApi.error('处理文件失败');
    }
  };

  const handleFileUpload = async (
    file: File,
    isConnected: boolean,
    audioUrl: string,
    setRecordedAudio: (audio: RecordingResult) => void,
    setAudioUrl: (url: string) => void
  ) => {
    if (!isConnected) {
      messageApi.error('请先连接WebSocket服务器');
      return false;
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !['wav', 'mp3', 'pcm'].includes(fileExt)) {
      messageApi.error('仅支持WAV、MP3或PCM格式的音频文件');
      return false;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();

      let pcmData: Int16Array;
      let sampleRate = 16000;

      if (fileExt === 'wav') {
        const result = AudioUtils.wavToPcm(arrayBuffer);
        pcmData = result.pcmData;
        sampleRate = result.sampleRate;
      } else if (fileExt === 'pcm') {
        pcmData = new Int16Array(arrayBuffer);
      } else {
        messageApi.error('暂不支持MP3格式，请上传WAV或PCM格式的文件');
        return false;
      }

      if (sampleRate !== 16000) {
        pcmData = AudioUtils.resampleAudio(pcmData, sampleRate, 16000);
      }

      await processUploadedFile(file, pcmData, audioUrl, setRecordedAudio, setAudioUrl);
    } catch (error) {
      console.error('处理文件失败:', error);
      messageApi.error('处理文件失败');
    }

    return false;
  };

  return {
    handleFileUpload
  };
};
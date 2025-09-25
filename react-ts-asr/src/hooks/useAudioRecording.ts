import { useState, useRef } from 'react';
import { App } from 'antd';
import { AudioRecorderService, type RecordingResult } from '../services/AudioRecorderService';

export const useAudioRecording = (onAudioProcess: (buffer: Int16Array, powerLevel: number, bufferDuration: number, bufferSampleRate: number) => void) => {
  const { message: messageApi } = App.useApp();
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedAudio, setRecordedAudio] = useState<RecordingResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const audioRecorderRef = useRef<AudioRecorderService | null>(null);

  const initRecorder = () => {
    audioRecorderRef.current = new AudioRecorderService({
      onProcess: onAudioProcess
    });
  };

  const startRecording = async (isConnected: boolean) => {
    if (!isConnected) {
      messageApi.error('请先连接服务器');
      return;
    }

    if (!audioRecorderRef.current) {
      return;
    }

    try {
      const success = await audioRecorderRef.current.start();

      if (success) {
        setIsRecording(true);
        messageApi.success('开始录音');
      } else {
        messageApi.error('启动录音失败');
      }
    } catch (error) {
      console.error('录音启动异常:', error);
      messageApi.error('录音启动异常');
    }
  };

  const stopRecording = () => {
    if (audioRecorderRef.current) {
      const result = audioRecorderRef.current.stop();
      setIsRecording(false);

      if (result) {
        setRecordedAudio(result);

        if (result.blob) {
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
          }

          const newAudioUrl = URL.createObjectURL(result.blob);
          setAudioUrl(newAudioUrl);
          messageApi.success(`录音完成！时长: ${result.duration.toFixed(1)}秒`);
        }
      }
    }
  };

  const clearAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl('');
    setRecordedAudio(null);
    messageApi.success('已清除录音');
  };

  const getRecordingState = () => {
    return audioRecorderRef.current?.getRecordingState() || false;
  };

  return {
    isRecording,
    recordedAudio,
    audioUrl,
    setRecordedAudio,
    setAudioUrl,
    initRecorder,
    startRecording,
    stopRecording,
    clearAudio,
    getRecordingState,
    audioRecorderRef
  };
};
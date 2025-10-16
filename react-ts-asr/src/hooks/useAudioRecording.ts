import { useState, useRef } from 'react';
import { App } from 'antd';
import { AudioRecorderService, type RecordingResult } from '../services/AudioRecorderService';
import { SystemAudioRecorderService, type SystemRecordingResult } from '../services/SystemAudioRecorderService';

export type RecordingMode = 'microphone' | 'system';

export const useAudioRecording = (onAudioProcess: (buffer: Int16Array, powerLevel: number, bufferDuration: number, bufferSampleRate: number) => void) => {
  const { message: messageApi } = App.useApp();
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedAudio, setRecordedAudio] = useState<RecordingResult | SystemRecordingResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('microphone');
  const audioRecorderRef = useRef<AudioRecorderService | null>(null);
  const systemAudioRecorderRef = useRef<SystemAudioRecorderService | null>(null);

  const initRecorder = () => {
    if (recordingMode === 'microphone') {
      audioRecorderRef.current = new AudioRecorderService({
        onProcess: onAudioProcess
      });
    } else {
      systemAudioRecorderRef.current = new SystemAudioRecorderService({
        onProcess: onAudioProcess
      });
    }
  };

  const startRecording = async (isConnected: boolean) => {
    if (!isConnected) {
      messageApi.error('请先连接服务器');
      return;
    }

    // 确保录音器已初始化
    if (!audioRecorderRef.current && !systemAudioRecorderRef.current) {
      console.log('useAudioRecording: 初始化录音器...');
      initRecorder();
    }

    const currentRecorder = recordingMode === 'microphone' 
      ? audioRecorderRef.current 
      : systemAudioRecorderRef.current;

    if (!currentRecorder) {
      console.error('useAudioRecording: 录音器未初始化');
      messageApi.error('录音器初始化失败');
      return;
    }

    console.log(`useAudioRecording: 开始${recordingMode}录音...`);

    try {
      const result = await currentRecorder.start();

      if (result && typeof result === 'object' && 'success' in result) {
        // 新的返回格式
        if (result.success) {
          setIsRecording(true);
          const modeText = recordingMode === 'microphone' ? '麦克风录音' : '系统录音';
          messageApi.success(`开始${modeText}`);
        } else {
          const modeText = recordingMode === 'microphone' ? '麦克风录音' : '系统录音';
          const errorMsg = result.error || `启动${modeText}失败`;
          messageApi.error(errorMsg);
          
          // 如果是麦克风权限问题，提供额外的帮助信息
          if (recordingMode === 'microphone' && result.error?.includes('权限')) {
            setTimeout(() => {
              messageApi.info('提示：如果是手机浏览器，请确保已信任HTTPS证书并允许麦克风权限');
            }, 2000);
          }
        }
      } else {
        // 兼容旧的boolean返回格式
        const success = result as boolean;
        if (success) {
          setIsRecording(true);
          const modeText = recordingMode === 'microphone' ? '麦克风录音' : '系统录音';
          messageApi.success(`开始${modeText}`);
        } else {
          const modeText = recordingMode === 'microphone' ? '麦克风录音' : '系统录音';
          messageApi.error(`启动${modeText}失败`);
        }
      }
    } catch (error) {
      console.error('录音启动异常:', error);
      messageApi.error('录音启动异常');
    }
  };

  const stopRecording = () => {
    const currentRecorder = recordingMode === 'microphone' 
      ? audioRecorderRef.current 
      : systemAudioRecorderRef.current;

    if (currentRecorder) {
      const result = currentRecorder.stop();
      setIsRecording(false);

      if (result) {
        setRecordedAudio(result);

        if (result.blob) {
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
          }

          const newAudioUrl = URL.createObjectURL(result.blob);
          setAudioUrl(newAudioUrl);
          const modeText = recordingMode === 'microphone' ? '麦克风录音' : '系统录音';
          messageApi.success(`${modeText}完成！时长: ${result.duration.toFixed(1)}秒`);
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
    const currentRecorder = recordingMode === 'microphone' 
      ? audioRecorderRef.current 
      : systemAudioRecorderRef.current;
    return currentRecorder?.getRecordingState() || false;
  };

  const switchRecordingMode = (mode: RecordingMode) => {
    if (isRecording) {
      messageApi.warning('请先停止当前录音再切换模式');
      return;
    }
    setRecordingMode(mode);
    // 清理之前的录音器实例
    audioRecorderRef.current = null;
    systemAudioRecorderRef.current = null;
  };

  return {
    isRecording,
    recordedAudio,
    audioUrl,
    recordingMode,
    setRecordedAudio,
    setAudioUrl,
    initRecorder,
    startRecording,
    stopRecording,
    clearAudio,
    getRecordingState,
    switchRecordingMode,
    audioRecorderRef,
    systemAudioRecorderRef
  };
};
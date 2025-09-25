import { useState, useEffect } from 'react';
import { App } from 'antd';
import type { RecordingResult } from '../services/AudioRecorderService';

export const useVoiceRecognition = () => {
  const { message: messageApi } = App.useApp();
  const [recognitionResults, setRecognitionResults] = useState<any[]>([]);
  const [isRecognizing, setIsRecognizing] = useState<boolean>(false);
  const [batchSizeS, setBatchSizeS] = useState<number>(300);
  const [recognitionHotword, setRecognitionHotword] = useState<string>('');
  const [editedResults, setEditedResults] = useState<any[]>([]);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [editingText, setEditingText] = useState<string>('');

  useEffect(() => {
    setEditedResults([...recognitionResults]);
  }, [recognitionResults]);

  const handleRecognizeAudio = async (recordedAudio: RecordingResult | null) => {
    if (!recordedAudio || !recordedAudio.blob) {
      messageApi.error('请先录音或上传音频文件');
      return;
    }

    setIsRecognizing(true);
    setRecognitionResults([]);

    try {
      const formData = new FormData();
      formData.append('audio', recordedAudio.blob, 'audio.wav');
      formData.append('batch_size_s', batchSizeS.toString());
      if (recognitionHotword.trim()) {
        formData.append('hotword', recognitionHotword.trim());
      }

      const response = await fetch('https://192.168.1.66:10096/api/recognize', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`识别失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setRecognitionResults(result.data || []);
        messageApi.success(`识别完成！共识别出 ${result.data?.length || 0} 个语音段`);
      } else {
        throw new Error(result.error || '识别失败');
      }
    } catch (error) {
      console.error('语音识别失败:', error);
      messageApi.error(`语音识别失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsRecognizing(false);
    }
  };

  const startEditText = (index: number, currentText: string) => {
    setEditingIndex(index);
    setEditingText(currentText);
  };

  const saveEditText = () => {
    if (editingIndex !== -1) {
      const newResults = [...editedResults];
      newResults[editingIndex] = {
        ...newResults[editingIndex],
        text: editingText
      };
      setEditedResults(newResults);
      setEditingIndex(-1);
      setEditingText('');
      messageApi.success('文本编辑已保存');
    }
  };

  const cancelEdit = () => {
    setEditingIndex(-1);
    setEditingText('');
  };

  const clearResults = () => {
    setEditedResults([]);
    setRecognitionResults([]);
    messageApi.success('已清除识别结果');
  };

  return {
    recognitionResults,
    isRecognizing,
    batchSizeS,
    setBatchSizeS,
    recognitionHotword,
    setRecognitionHotword,
    editedResults,
    editingIndex,
    editingText,
    setEditingText,
    handleRecognizeAudio,
    startEditText,
    saveEditText,
    cancelEdit,
    clearResults,
    setEditedResults
  };
};
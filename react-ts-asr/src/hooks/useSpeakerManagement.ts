import { useState } from 'react';
import { App } from 'antd';

export const useSpeakerManagement = () => {
  const { message: messageApi } = App.useApp();
  const [speakerReplaceVisible, setSpeakerReplaceVisible] = useState<boolean>(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string>('');
  const [newSpeakerName, setNewSpeakerName] = useState<string>('');

  const openSpeakerReplace = (speaker: string) => {
    setCurrentSpeaker(speaker);
    setNewSpeakerName('');
    setSpeakerReplaceVisible(true);
  };

  const closeSpeakerReplace = () => {
    setSpeakerReplaceVisible(false);
    setCurrentSpeaker('');
    setNewSpeakerName('');
  };

  const handleSpeakerReplace = (editedResults: any[], setEditedResults: (results: any[]) => void) => {
    if (!newSpeakerName.trim()) {
      messageApi.error('请输入新的说话人名称');
      return;
    }

    const newResults = editedResults.map(result => {
      if (result.speaker === currentSpeaker) {
        return {
          ...result,
          speaker: newSpeakerName.trim()
        };
      }
      return result;
    });

    setEditedResults(newResults);
    setSpeakerReplaceVisible(false);
    messageApi.success(`已将"${currentSpeaker}"替换为"${newSpeakerName.trim()}"`);
  };

  return {
    speakerReplaceVisible,
    currentSpeaker,
    newSpeakerName,
    setNewSpeakerName,
    openSpeakerReplace,
    closeSpeakerReplace,
    handleSpeakerReplace
  };
};
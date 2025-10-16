import { useState, useEffect } from 'react';

export type MobilePanelType = 'recording' | 'recognition' | 'ai-summary';

export interface MobilePanelState {
  currentPanel: MobilePanelType;
  showPanelSwitcher: boolean;
}

export const useMobilePanelState = () => {
  const [currentPanel, setCurrentPanel] = useState<MobilePanelType>('recording');
  const [showPanelSwitcher, setShowPanelSwitcher] = useState(false);

  // 检测是否为移动端
  const isMobile = () => {
    return window.innerWidth <= 768;
  };

  // 根据录音状态和音频URL自动切换面板
  const updatePanelState = (audioUrl: string, isRecording: boolean, _hasResults: boolean, showAISummary: boolean) => {
    if (!isMobile()) {
      setShowPanelSwitcher(false);
      return;
    }

    setShowPanelSwitcher(true);

    // 录音中时显示录音面板
    if (isRecording) {
      setCurrentPanel('recording');
      return;
    }

    // AI总结面板打开时显示AI总结
    if (showAISummary) {
      setCurrentPanel('ai-summary');
      return;
    }

    // 录音完成后自动切换到语音识别面板（包含语音分离和识别结果）
    if (audioUrl) {
      setCurrentPanel('recognition');
      return;
    }

    // 默认显示录音面板
    setCurrentPanel('recording');
  };

  // 手动切换面板
  const switchToPanel = (panel: MobilePanelType) => {
    if (isMobile()) {
      setCurrentPanel(panel);
    }
  };

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (!isMobile()) {
        setShowPanelSwitcher(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // 初始检查

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return {
    currentPanel,
    showPanelSwitcher,
    isMobile: isMobile(),
    updatePanelState,
    switchToPanel,
  };
};
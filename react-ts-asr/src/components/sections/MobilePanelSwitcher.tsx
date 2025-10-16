import React from 'react';
import type { MobilePanelType } from '../../hooks/useMobilePanelState';

interface MobilePanelSwitcherProps {
  currentPanel: MobilePanelType;
  onPanelSwitch: (panel: MobilePanelType) => void;
  hasAudio: boolean;
  hasResults: boolean;
  showAISummary: boolean;
}

const MobilePanelSwitcher: React.FC<MobilePanelSwitcherProps> = ({
  currentPanel,
  onPanelSwitch,
  hasAudio,
  hasResults: _,
  showAISummary
}) => {
  const panels = [
    {
      id: 'recording' as MobilePanelType,
      label: '录音',
      disabled: false
    },
    {
      id: 'recognition' as MobilePanelType,
      label: '语音识别',
      disabled: !hasAudio
    },
    {
      id: 'ai-summary' as MobilePanelType,
      label: 'AI总结',
      disabled: !showAISummary
    }
  ];

  return (
    <div className="mobile-panel-switcher">
      {panels.map((panel) => (
        <button
          key={panel.id}
          className={`panel-switch-btn ${currentPanel === panel.id ? 'active' : ''} ${panel.disabled ? 'disabled' : ''}`}
          onClick={() => !panel.disabled && onPanelSwitch(panel.id)}
          disabled={panel.disabled}
        >
          {panel.label}
        </button>
      ))}
    </div>
  );
};

export default MobilePanelSwitcher;
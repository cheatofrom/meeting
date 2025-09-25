import React from 'react';
import { Button, Space, Typography } from 'antd';
import type { RecordingResult } from '../../services/AudioRecorderService';

const { Title } = Typography;

interface AudioPlayerSectionProps {
  audioUrl: string;
  recordedAudio: RecordingResult | null;
  onDownload: () => void;
  onClear: () => void;
}

export const AudioPlayerSection: React.FC<AudioPlayerSectionProps> = ({
  audioUrl,
  recordedAudio,
  onDownload,
  onClear
}) => {
  if (!audioUrl) return null;

  return (
    <div className="audio-panel" style={{ marginTop: '16px' }}>
      <Title level={4}>录音播放</Title>
      <Space direction="vertical" style={{ width: '100%' }}>
        <audio
          controls
          src={audioUrl}
          style={{ width: '100%' }}
          preload="metadata"
        >
          您的浏览器不支持音频播放
        </audio>

        {recordedAudio && (
          <div style={{ fontSize: '12px', color: '#666' }}>
            录音信息: 时长 {recordedAudio.duration.toFixed(1)}秒 |
            采样率 {recordedAudio.sampleRate}Hz |
            数据长度 {recordedAudio.audioData.length} samples
          </div>
        )}

        <Space>
          <Button
            size="small"
            onClick={onDownload}
          >
            下载音频
          </Button>

          <Button
            size="small"
            onClick={onClear}
          >
            清除录音
          </Button>
        </Space>
      </Space>
    </div>
  );
};
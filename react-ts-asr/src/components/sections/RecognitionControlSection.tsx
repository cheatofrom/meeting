import React from 'react';
import { Button, Input, Space, Typography } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface RecognitionControlSectionProps {
  audioUrl: string;
  batchSizeS: number;
  setBatchSizeS: (value: number) => void;
  recognitionHotword: string;
  setRecognitionHotword: (value: string) => void;
  isRecognizing: boolean;
  recordedAudio: any;
  onRecognize: () => void;
}

export const RecognitionControlSection: React.FC<RecognitionControlSectionProps> = ({
  audioUrl,
  batchSizeS,
  setBatchSizeS,
  recognitionHotword,
  setRecognitionHotword,
  isRecognizing,
  recordedAudio,
  onRecognize
}) => {
  if (!audioUrl) return null;

  return (
    <div className="recognition-panel" style={{ marginTop: '16px' }}>
      <Title level={4}>语音分离</Title>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space wrap>
          <Input
            addonBefore="批处理大小(秒)"
            value={batchSizeS}
            onChange={(e) => setBatchSizeS(Number(e.target.value) || 300)}
            style={{ width: 200 }}
            type="number"
            min={1}
            max={3600}
          />
          <Input
            addonBefore="热词"
            value={recognitionHotword}
            onChange={(e) => setRecognitionHotword(e.target.value)}
            style={{ width: 200 }}
            placeholder="如：魔搭"
          />
        </Space>

        <Button
          type="primary"
          icon={<SettingOutlined />}
          loading={isRecognizing}
          onClick={onRecognize}
          disabled={!recordedAudio}
        >
          {isRecognizing ? '识别中...' : '开始识别'}
        </Button>
      </Space>
    </div>
  );
};
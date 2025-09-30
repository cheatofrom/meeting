import React from 'react';
import { Button, Input, Switch, Upload, Space, Typography, Badge, Radio } from 'antd';

const { Text } = Typography;
import { AudioOutlined, UploadOutlined, DesktopOutlined } from '@ant-design/icons';
import type { RecordingMode } from '../../hooks/useAudioRecording';

interface ControlPanelSectionProps {
  useITN: boolean;
  setUseITN: (value: boolean) => void;
  hotwords: string;
  setHotwords: (value: string) => void;
  isConnected: boolean;
  isRecording: boolean;
  recordingMode: RecordingMode;
  onConnect: () => void;
  onDisconnect: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onFileUpload: (file: File) => Promise<boolean>;
  onClearText: () => void;
  onSwitchRecordingMode: (mode: RecordingMode) => void;
}

export const ControlPanelSection: React.FC<ControlPanelSectionProps> = ({
  useITN,
  setUseITN,
  hotwords,
  setHotwords,
  isConnected,
  isRecording,
  recordingMode,
  onConnect,
  onDisconnect,
  onStartRecording,
  onStopRecording,
  onFileUpload,
  onClearText,
  onSwitchRecordingMode
}) => {
  return (
    <div className="control-panel">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space wrap>
          <Space>
            <Text>使用ITN:</Text>
            <Switch checked={useITN} onChange={setUseITN} disabled={isConnected} />
          </Space>

          <Space>
            <Text>热词设置:</Text>
            <Input
              placeholder="输入热词，用逗号分隔"
              value={hotwords}
              onChange={(e) => setHotwords(e.target.value)}
              style={{ width: 200 }}
              disabled={isConnected}
            />
          </Space>

          {/* 连接状态指示器 */}
          <Space>
            <Text>连接状态:</Text>
            <Badge 
              status={isConnected ? "success" : "error"} 
              text={isConnected ? "已连接" : "未连接"} 
            />
          </Space>
        </Space>

        {/* 录音模式选择 */}
        <Space wrap>
          <Text>录音模式:</Text>
          <Radio.Group 
            value={recordingMode} 
            onChange={(e) => onSwitchRecordingMode(e.target.value)}
            disabled={isRecording}
          >
            <Radio.Button value="microphone">
              <AudioOutlined /> 麦克风录音
            </Radio.Button>
            <Radio.Button value="system">
              <DesktopOutlined /> 系统录音
            </Radio.Button>
          </Radio.Group>
        </Space>

        <Space wrap>
          <Button
            type="primary"
            onClick={isConnected ? onDisconnect : onConnect}
          >
            {isConnected ? '断开连接' : '连接服务器'}
          </Button>

          <Button
            type="primary"
            icon={recordingMode === 'microphone' ? <AudioOutlined /> : <DesktopOutlined />}
            onClick={() => {
              console.log('ControlPanelSection: 录音按钮被点击, 当前模式:', recordingMode, '录音状态:', isRecording);
              if (isRecording) {
                onStopRecording();
              } else {
                onStartRecording();
              }
            }}
            disabled={!isConnected}
          >
            {isRecording ? '停止录音' : `开始${recordingMode === 'microphone' ? '麦克风' : '系统'}录音`}
          </Button>

          <Upload
            beforeUpload={onFileUpload}
            showUploadList={false}
            accept=".wav,.mp3,.m4a,.flac,.aac"
          >
            <Button icon={<UploadOutlined />}>
              上传音频文件
            </Button>
          </Upload>

          <Button onClick={onClearText}>
            清除文本
          </Button>
        </Space>
      </Space>
    </div>
  );
};
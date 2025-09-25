import React from 'react';
import { Button, Input, Switch, Upload, Space, Typography } from 'antd';

const { Text } = Typography;
import { AudioOutlined, UploadOutlined } from '@ant-design/icons';

interface ControlPanelSectionProps {
  useITN: boolean;
  setUseITN: (value: boolean) => void;
  hotwords: string;
  setHotwords: (value: string) => void;
  isConnected: boolean;
  isRecording: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onFileUpload: (file: File) => Promise<boolean>;
  onClearText: () => void;
}

export const ControlPanelSection: React.FC<ControlPanelSectionProps> = ({
  useITN,
  setUseITN,
  hotwords,
  setHotwords,
  isConnected,
  isRecording,
  onConnect,
  onDisconnect,
  onStartRecording,
  onStopRecording,
  onFileUpload,
  onClearText
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
            icon={<AudioOutlined />}
            onClick={isRecording ? onStopRecording : onStartRecording}
            disabled={!isConnected}
          >
            {isRecording ? '停止录音' : '开始录音'}
          </Button>

          <Upload
            beforeUpload={onFileUpload}
            showUploadList={false}
            disabled={!isConnected || isRecording}
          >
            <Button icon={<UploadOutlined />} disabled={!isConnected || isRecording}>
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
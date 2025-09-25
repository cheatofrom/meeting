import React from 'react';
import { Modal, Input, Typography } from 'antd';

const { Text } = Typography;

interface SpeakerReplaceModalProps {
  visible: boolean;
  currentSpeaker: string;
  newSpeakerName: string;
  setNewSpeakerName: (name: string) => void;
  onOk: () => void;
  onCancel: () => void;
}

export const SpeakerReplaceModal: React.FC<SpeakerReplaceModalProps> = ({
  visible,
  currentSpeaker,
  newSpeakerName,
  setNewSpeakerName,
  onOk,
  onCancel
}) => {
  return (
    <Modal
      title="替换说话人名称"
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      okText="替换"
      cancelText="取消"
    >
      <div style={{ marginBottom: '16px' }}>
        <Text>当前说话人: <Text strong>{currentSpeaker}</Text></Text>
      </div>
      <div>
        <Text>新的说话人名称:</Text>
        <Input
          value={newSpeakerName}
          onChange={(e) => setNewSpeakerName(e.target.value)}
          placeholder="请输入真实姓名"
          style={{ marginTop: '8px' }}
          onPressEnter={onOk}
        />
      </div>
    </Modal>
  );
};
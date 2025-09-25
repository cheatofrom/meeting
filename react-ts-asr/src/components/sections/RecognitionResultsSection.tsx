import React from 'react';
import { Button, Space, Typography, Tooltip, Input } from 'antd';
import { RobotOutlined, SaveOutlined, DownloadOutlined, UserOutlined, EditOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface RecognitionResultsSectionProps {
  editedResults: any[];
  editingIndex: number;
  editingText: string;
  setEditingText: (text: string) => void;
  onStartEdit: (index: number, text: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onAISummary: () => void;
  onExportTxt: () => void;
  onExportJson: () => void;
  onSpeakerClick: (speaker: string) => void;
  onCopyResults: () => void;
  onClearResults: () => void;
}

export const RecognitionResultsSection: React.FC<RecognitionResultsSectionProps> = ({
  editedResults,
  editingIndex,
  editingText,
  setEditingText,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onAISummary,
  onExportTxt,
  onExportJson,
  onSpeakerClick,
  onCopyResults,
  onClearResults
}) => {
  if (editedResults.length === 0) return null;

  return (
    <div className="recognition-results" style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <Title level={4}>识别结果 ({editedResults.length}个语音段)</Title>
        <Space>
          <Button
            size="small"
            icon={<RobotOutlined />}
            onClick={onAISummary}
            type="primary"
            style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
          >
            AI总结
          </Button>
          <Button
            size="small"
            icon={<SaveOutlined />}
            onClick={onExportTxt}
          >
            导出文本
          </Button>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={onExportJson}
          >
            导出JSON
          </Button>
        </Space>
      </div>

      <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: '6px', padding: '12px' }}>
        {editedResults.map((result, index) => (
          <div key={index} style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px', border: editingIndex === index ? '2px solid #1890ff' : '1px solid transparent' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>[{result.time_range}]</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tooltip title="点击替换说话人名称">
                  <Button
                    type="text"
                    size="small"
                    icon={<UserOutlined />}
                    onClick={() => onSpeakerClick(result.speaker)}
                    style={{ padding: '0 4px', height: 'auto', fontSize: '12px' }}
                  >
                    {result.speaker}
                  </Button>
                </Tooltip>
              </div>
            </div>

            <div style={{ fontSize: '14px', lineHeight: '1.5', position: 'relative' }}>
              {editingIndex === index ? (
                <div>
                  <Input.TextArea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    autoSize={{ minRows: 2, maxRows: 6 }}
                    style={{ marginBottom: '8px' }}
                  />
                  <Space size="small">
                    <Button size="small" type="primary" onClick={onSaveEdit}>
                      保存
                    </Button>
                    <Button size="small" onClick={onCancelEdit}>
                      取消
                    </Button>
                  </Space>
                </div>
              ) : (
                <div
                  style={{ cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                  onClick={() => onStartEdit(index, result.text)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e6f7ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {result.text}
                  <EditOutlined style={{ marginLeft: '8px', color: '#1890ff', opacity: 0.6 }} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Space style={{ marginTop: '8px' }}>
        <Button
          size="small"
          onClick={onCopyResults}
        >
          复制全部结果
        </Button>

        <Button
          size="small"
          onClick={onClearResults}
        >
          清除结果
        </Button>
      </Space>
    </div>
  );
};
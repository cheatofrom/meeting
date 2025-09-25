import React from 'react';
import { Input, Select, Space, Collapse, Button, Typography } from 'antd';
import { SettingOutlined, EditOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;

interface AIConfigSectionProps {
  aiModel: string;
  setAiModel: (model: string) => void;
  availableModels: any[];
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  userPrompt: string;
  setUserPrompt: (prompt: string) => void;
  onOpenPromptModal: () => void;
}

export const AIConfigSection: React.FC<AIConfigSectionProps> = ({
  aiModel,
  setAiModel,
  availableModels,
  systemPrompt,
  setSystemPrompt,
  userPrompt,
  setUserPrompt,
  onOpenPromptModal
}) => {
  return (
    <Collapse
      size="small"
      style={{ marginBottom: '12px' }}
      items={[{
        key: 'config',
        label: (
          <span style={{ fontSize: '13px' }}>
            <SettingOutlined style={{ marginRight: '6px' }} />
            AI配置
          </span>
        ),
        children: (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>AI模型选择:</Text>
              <Select
                value={aiModel}
                onChange={setAiModel}
                style={{ width: '100%', marginTop: '4px' }}
                options={availableModels.map(model => ({
                  value: model.value,
                  label: model.label,
                  title: model.description
                }))}
                optionRender={(option) => {
                  const model = availableModels.find(m => m.value === option.value);
                  return (
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                        {model?.label}
                        {model?.type === 'local' && (
                          <span style={{
                            marginLeft: '8px',
                            padding: '2px 6px',
                            backgroundColor: '#52c41a',
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '10px'
                          }}>
                            本地
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                        {model?.description}
                      </div>
                    </div>
                  );
                }}
                loading={availableModels.length === 0}
                placeholder="加载模型列表中..."
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <Text strong>系统提示词 (System Prompt):</Text>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={onOpenPromptModal}
                  type="link"
                  style={{ padding: '0 4px' }}
                >
                  管理模板
                </Button>
              </div>
              <TextArea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="定义AI的角色和基本要求..."
                autoSize={{ minRows: 2, maxRows: 4 }}
                style={{ marginTop: '4px', marginBottom: '12px' }}
              />
            </div>
            <div>
              <Text strong>用户提示词 (User Prompt):</Text>
              <TextArea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="具体的任务指令..."
                autoSize={{ minRows: 2, maxRows: 4 }}
                style={{ marginTop: '4px' }}
              />
            </div>
          </Space>
        )
      }]}
    />
  );
};
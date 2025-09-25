import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Space, Typography, Tabs, message, Popconfirm } from 'antd';
import { EditOutlined, UndoOutlined, BulbOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Text } = Typography;

interface PromptTemplate {
  id: string;
  name: string;
  systemPrompt: string;
  userPrompt: string;
  description?: string;
}

interface PromptManagerModalProps {
  visible: boolean;
  systemPrompt: string;
  userPrompt: string;
  onOk: (systemPrompt: string, userPrompt: string) => void;
  onCancel: () => void;
}

export const PromptManagerModal: React.FC<PromptManagerModalProps> = ({
  visible,
  systemPrompt,
  userPrompt,
  onOk,
  onCancel,
}) => {
  const [localSystemPrompt, setLocalSystemPrompt] = useState(systemPrompt);
  const [localUserPrompt, setLocalUserPrompt] = useState(userPrompt);
  const [activeTab, setActiveTab] = useState('edit');

  // 预设模板
  const templates: PromptTemplate[] = [
    {
      id: 'default',
      name: '默认会议纪要',
      systemPrompt: '你是一个专业的会议纪要助手，擅长分析会议内容并生成结构化的总结。请以专业、客观的语调进行总结，确保信息准确、条理清晰。',
      userPrompt: '请对以下会议内容进行总结，提取关键信息、决策事项和行动计划：',
      description: '标准的会议纪要生成模板'
    },
    {
      id: 'detailed',
      name: '详细会议报告',
      systemPrompt: '你是一位资深的会议秘书，具有丰富的会议记录和总结经验。你需要生成详细、完整的会议报告，包含所有重要信息和细节。',
      userPrompt: '请生成一份详细的会议报告，包括：1）会议概述 2）详细议程和讨论内容 3）关键决策和投票结果 4）行动计划和责任人 5）后续跟进事项。请确保报告结构清晰，信息完整：',
      description: '生成详细完整的会议报告'
    },
    {
      id: 'executive',
      name: '高管摘要',
      systemPrompt: '你是一名为高级管理层服务的执行助理，擅长将复杂的会议内容提炼为简洁有力的高管摘要。',
      userPrompt: '请为高管层生成一份简洁的会议摘要，重点突出：1）核心决策 2）关键风险和机会 3）需要高管关注的事项 4）预算和资源影响。请保持内容精炼，突出重点：',
      description: '为高管层定制的简洁摘要'
    },
    {
      id: 'action',
      name: '行动计划导向',
      systemPrompt: '你是一个项目管理专家，专注于从会议内容中提取可执行的行动计划和任务分配。',
      userPrompt: '请重点关注会议中的行动计划，生成包含以下内容的总结：1）明确的行动项目清单 2）每项任务的负责人 3）完成时间节点 4）成功标准和验收条件 5）风险和依赖关系：',
      description: '专注于行动计划和任务管理'
    }
  ];

  const [customTemplates, setCustomTemplates] = useState<PromptTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState('');

  useEffect(() => {
    if (visible) {
      setLocalSystemPrompt(systemPrompt);
      setLocalUserPrompt(userPrompt);
      loadCustomTemplates();
    }
  }, [visible, systemPrompt, userPrompt]);

  const loadCustomTemplates = () => {
    try {
      const saved = localStorage.getItem('custom-prompt-templates');
      if (saved) {
        setCustomTemplates(JSON.parse(saved));
      }
    } catch (error) {
      console.error('加载自定义模板失败:', error);
    }
  };

  const saveCustomTemplates = (templates: PromptTemplate[]) => {
    try {
      localStorage.setItem('custom-prompt-templates', JSON.stringify(templates));
      setCustomTemplates(templates);
    } catch (error) {
      console.error('保存自定义模板失败:', error);
      message.error('保存模板失败');
    }
  };

  const handleOk = () => {
    onOk(localSystemPrompt, localUserPrompt);
  };

  const handleCancel = () => {
    setLocalSystemPrompt(systemPrompt);
    setLocalUserPrompt(userPrompt);
    onCancel();
  };

  const handleReset = () => {
    setLocalSystemPrompt(systemPrompt);
    setLocalUserPrompt(userPrompt);
    message.success('已重置为当前设置');
  };

  const applyTemplate = (template: PromptTemplate) => {
    setLocalSystemPrompt(template.systemPrompt);
    setLocalUserPrompt(template.userPrompt);
    message.success(`已应用模板：${template.name}`);
    setActiveTab('edit');
  };

  const saveAsTemplate = () => {
    if (!newTemplateName.trim()) {
      message.error('请输入模板名称');
      return;
    }

    const newTemplate: PromptTemplate = {
      id: Date.now().toString(),
      name: newTemplateName.trim(),
      systemPrompt: localSystemPrompt,
      userPrompt: localUserPrompt,
      description: '自定义模板'
    };

    const updatedCustomTemplates = [...customTemplates, newTemplate];
    saveCustomTemplates(updatedCustomTemplates);
    setNewTemplateName('');
    message.success('模板保存成功');
  };

  const deleteCustomTemplate = (templateId: string) => {
    const updatedTemplates = customTemplates.filter(t => t.id !== templateId);
    saveCustomTemplates(updatedTemplates);
    message.success('模板删除成功');
  };

  const systemPromptRows = Math.max(6, Math.ceil(localSystemPrompt.length / 80));
  const userPromptRows = Math.max(4, Math.ceil(localUserPrompt.length / 80));

  return (
    <Modal
      title="提示词管理"
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      width={800}
      style={{ top: 20 }}
      okText="确定"
      cancelText="取消"
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'edit',
            label: (
              <span>
                <EditOutlined />
                编辑提示词
              </span>
            ),
            children: (
              <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  <div>
                    <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong>系统提示词 (System Prompt)</Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {localSystemPrompt.length} 字符
                      </Text>
                    </div>
                    <TextArea
                      value={localSystemPrompt}
                      onChange={(e) => setLocalSystemPrompt(e.target.value)}
                      placeholder="定义AI的角色、能力和基本要求..."
                      autoSize={{ minRows: systemPromptRows, maxRows: 12 }}
                      style={{
                        fontSize: '14px',
                        lineHeight: '1.6',
                        fontFamily: 'Monaco, Consolas, "Courier New", monospace'
                      }}
                    />
                    <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      系统提示词定义了AI助手的角色、能力范围和基本行为规范
                    </Text>
                  </div>

                  <div>
                    <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong>用户提示词 (User Prompt)</Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {localUserPrompt.length} 字符
                      </Text>
                    </div>
                    <TextArea
                      value={localUserPrompt}
                      onChange={(e) => setLocalUserPrompt(e.target.value)}
                      placeholder="具体的任务指令和要求..."
                      autoSize={{ minRows: userPromptRows, maxRows: 8 }}
                      style={{
                        fontSize: '14px',
                        lineHeight: '1.6',
                        fontFamily: 'Monaco, Consolas, "Courier New", monospace'
                      }}
                    />
                    <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      用户提示词包含具体的任务指令、输出格式要求和特殊需求
                    </Text>
                  </div>

                  <div style={{ textAlign: 'right', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
                    <Space>
                      <Button
                        icon={<UndoOutlined />}
                        onClick={handleReset}
                        size="small"
                      >
                        重置
                      </Button>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        总计: {localSystemPrompt.length + localUserPrompt.length} 字符
                      </Text>
                    </Space>
                  </div>
                </Space>
              </div>
            )
          },
          {
            key: 'templates',
            label: (
              <span>
                <BulbOutlined />
                模板库
              </span>
            ),
            children: (
              <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <div>
                    <Text strong>预设模板</Text>
                    <div style={{ marginTop: '12px' }}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {templates.map((template) => (
                          <div
                            key={template.id}
                            style={{
                              border: '1px solid #d9d9d9',
                              borderRadius: '6px',
                              padding: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#1890ff';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(24, 144, 255, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#d9d9d9';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                            onClick={() => applyTemplate(template)}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <Text strong>{template.name}</Text>
                                <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginTop: '4px' }}>
                                  {template.description}
                                </Text>
                              </div>
                              <Button type="primary" size="small">
                                应用
                              </Button>
                            </div>
                          </div>
                        ))}
                      </Space>
                    </div>
                  </div>

                  {customTemplates.length > 0 && (
                    <div style={{ marginTop: '24px' }}>
                      <Text strong>自定义模板</Text>
                      <div style={{ marginTop: '12px' }}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          {customTemplates.map((template) => (
                            <div
                              key={template.id}
                              style={{
                                border: '1px solid #d9d9d9',
                                borderRadius: '6px',
                                padding: '12px',
                                transition: 'all 0.2s',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <Text strong>{template.name}</Text>
                                  <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginTop: '4px' }}>
                                    {template.description}
                                  </Text>
                                </div>
                                <Space>
                                  <Button
                                    type="primary"
                                    size="small"
                                    onClick={() => applyTemplate(template)}
                                  >
                                    应用
                                  </Button>
                                  <Popconfirm
                                    title="删除模板"
                                    description="确定要删除这个模板吗？"
                                    onConfirm={() => deleteCustomTemplate(template.id)}
                                    okText="确定"
                                    cancelText="取消"
                                  >
                                    <Button
                                      danger
                                      size="small"
                                      icon={<DeleteOutlined />}
                                    />
                                  </Popconfirm>
                                </Space>
                              </div>
                            </div>
                          ))}
                        </Space>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '24px', padding: '16px', border: '1px dashed #d9d9d9', borderRadius: '6px' }}>
                    <Text strong>保存为新模板</Text>
                    <div style={{ marginTop: '12px' }}>
                      <Space.Compact style={{ width: '100%' }}>
                        <Input
                          placeholder="输入模板名称..."
                          value={newTemplateName}
                          onChange={(e) => setNewTemplateName(e.target.value)}
                          onPressEnter={saveAsTemplate}
                        />
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={saveAsTemplate}
                          disabled={!newTemplateName.trim()}
                        >
                          保存
                        </Button>
                      </Space.Compact>
                      <Text type="secondary" style={{ fontSize: '12px', marginTop: '6px', display: 'block' }}>
                        将当前编辑的提示词保存为自定义模板
                      </Text>
                    </div>
                  </div>
                </Space>
              </div>
            )
          }
        ]}
      />
    </Modal>
  );
};
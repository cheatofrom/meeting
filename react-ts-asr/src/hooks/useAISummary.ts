import { useState, useRef, useEffect } from 'react';
import { App } from 'antd';

export const useAISummary = () => {
  const { message: messageApi } = App.useApp();
  const [showAISummary, setShowAISummary] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'ai-summary'>('notes');
  const [notes, setNotes] = useState<string>('');
  const [aiModel, setAiModel] = useState<string>('qwen3:8b');
  const [systemPrompt, setSystemPrompt] = useState<string>('你是一个专业的会议纪要助手，擅长分析会议内容并生成结构化的总结。请以专业、客观的语调进行总结，确保信息准确、条理清晰。');
  const [userPrompt, setUserPrompt] = useState<string>('请对以下会议内容进行总结，提取关键信息、决策事项和行动计划：');
  const [aiSummaryResult, setAiSummaryResult] = useState<string>('');
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const aiSummaryResultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAvailableModels();
  }, []);

  const fetchAvailableModels = async () => {
    try {
      const response = await fetch('/ollama/api/tags');
      if (response.ok) {
        const result = await response.json();
        if (result.models && result.models.length > 0) {
          const ollamaModels = result.models.map((model: any) => ({
            value: model.name,
            label: `${model.name} (Ollama)`,
            description: `本地Ollama模型 - ${model.name}`,
            type: 'local',
            size: model.size
          }));
          setAvailableModels(ollamaModels);
          if (!ollamaModels.find((model: any) => model.value === aiModel)) {
            setAiModel(ollamaModels[0]?.value || 'gpt-oss:20b');
          }
        } else {
          throw new Error('没有找到可用的Ollama模型');
        }
      } else {
        throw new Error(`Ollama API请求失败: ${response.status}`);
      }
    } catch (error) {
      console.error('获取Ollama模型列表失败:', error);
      setAvailableModels([
        { value: 'gpt-oss:20b', label: 'GPT-OSS 20B (Ollama)', description: '本地部署，隐私安全，专业会议纪要生成', type: 'local' },
        { value: 'llama3.2:3b', label: 'Llama 3.2 3B (Ollama)', description: '轻量级模型，快速响应', type: 'local' },
        { value: 'qwen2.5:7b', label: 'Qwen 2.5 7B (Ollama)', description: '中文优化模型', type: 'local' }
      ]);
      messageApi.warning('无法连接到Ollama服务，使用默认模型列表');
    }
  };

  const handleAISummary = () => {
    setShowAISummary(true);
    messageApi.info('AI总结面板已打开');
  };

  // 检测是否为移动设备
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768);
  };

  // 检测浏览器是否支持流式处理
  const supportsStreamingFetch = () => {
    try {
      return 'ReadableStream' in window && 'getReader' in ReadableStream.prototype;
    } catch {
      return false;
    }
  };

  const generateAISummary = async (editedResults: any[]) => {
    if (editedResults.length === 0) {
      messageApi.error('请先进行语音识别获取会议内容');
      return;
    }

    setIsGeneratingAI(true);
    setAiSummaryResult('');

    try {
      const meetingContent = editedResults.map(result =>
        `[${result.time_range || result.startTime || result.start_time || '未知时间'}] ${result.speaker}: ${result.text}`
      ).join('\n');
      
      // 更新系统提示词，强调时间线的重要性
      const enhancedSystemPrompt = `${systemPrompt} 请特别注意会议的时间线，按照时间顺序整理讨论内容，并标注关键时间点。`;
      
      // 构建完整的提示词
      const fullPrompt = `${enhancedSystemPrompt}\n\n${userPrompt}\n\n会议内容:\n${meetingContent}`;
      // 打印调试信息
      console.log('传给AI模型的内容(fullPrompt):');
      console.log(fullPrompt);

      // 移动端或不支持流式处理时使用非流式模式
      const shouldUseStream = !isMobileDevice() && supportsStreamingFetch();

      const response = await fetch('/ollama/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: aiModel,
          prompt: fullPrompt,
          stream: shouldUseStream,  // 根据设备能力决定是否启用流式
          options: {
            num_ctx: 8192 // 设置上下文长度
        }
        }),
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }

      // 检查是否为流式响应
      const contentType = response.headers.get('content-type');
      const isStreamResponse = shouldUseStream && (contentType?.includes('text/plain') || contentType?.includes('application/x-ndjson'));

      if (isStreamResponse) {
        // 流式处理
        const reader = response.body?.getReader();
        if (!reader) {
          console.warn('无法获取响应流，降级到非流式处理');
          // 降级处理：重新请求非流式
          const fallbackResponse = await fetch('/ollama/api/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: aiModel,
              prompt: fullPrompt,
              stream: false,
              options: {
                num_ctx: 8192
              }
            }),
          });

          if (fallbackResponse.ok) {
            const result = await fallbackResponse.json();
            if (result.response) {
              setAiSummaryResult(result.response);
              // 使用setTimeout确保DOM更新后再滚动
              setTimeout(() => {
                if (aiSummaryResultRef.current) {
                  aiSummaryResultRef.current.scrollTop = aiSummaryResultRef.current.scrollHeight;
                }
              }, 100);
            }
          }
            return; // 降级处理后直接 return，避免后续 reader 相关代码执行
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');

            // 保留最后一行（可能不完整）
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim()) {
                try {
                  const data = JSON.parse(line);

                  if (data.error) {
                    throw new Error(data.error);
                  }

                  if (data.response) {
                    setAiSummaryResult(prev => {
                      const newContent = prev + data.response;
                      // 使用setTimeout确保DOM更新后再滚动
                      setTimeout(() => {
                        if (aiSummaryResultRef.current) {
                          aiSummaryResultRef.current.scrollTop = aiSummaryResultRef.current.scrollHeight;
                        }
                      }, 0);
                      return newContent;
                    });
                  }

                  if (data.done) {
                    break;
                  }
                } catch (parseError) {
                  console.warn('解析流数据失败:', parseError, line);
                }
              }
            }
          }
        } catch (streamError) {
          console.error('流式处理错误:', streamError);
          // 如果流式处理失败，尝试非流式降级
          messageApi.warning('流式处理失败，正在尝试非流式模式...');

          const fallbackResponse = await fetch('/ollama/api/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: aiModel,
              prompt: fullPrompt,
              stream: false,
              options: {
                num_ctx: 16384
              }
            }),
          });

          if (fallbackResponse.ok) {
            const result = await fallbackResponse.json();
            if (result.response) {
              setAiSummaryResult(result.response);
              // 使用setTimeout确保DOM更新后再滚动
              setTimeout(() => {
                if (aiSummaryResultRef.current) {
                  aiSummaryResultRef.current.scrollTop = aiSummaryResultRef.current.scrollHeight;
                }
              }, 100);
            }
          } else {
            throw new Error('降级处理也失败了');
          }
        }
      } else {
        // 非流式处理（一次性返回）
        const result = await response.json();

        if (result.error) {
          throw new Error(result.error);
        }

        if (result.response) {
          setAiSummaryResult(result.response);

          // 使用setTimeout确保DOM更新后再滚动
          setTimeout(() => {
            if (aiSummaryResultRef.current) {
              aiSummaryResultRef.current.scrollTop = aiSummaryResultRef.current.scrollHeight;
            }
          }, 100);
        }
      }

      messageApi.success('AI总结生成完成');
    } catch (error) {
      console.error('AI总结生成失败:', error);
      messageApi.error(`AI总结生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const saveNotes = () => {
    const blob = new Blob([notes], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting_notes_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    messageApi.success('笔记已保存');
  };

  // Helper function to remove think tags from content
  const removeThinkTags = (content: string) => {
    return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  };

  const saveAISummary = () => {
    if (!aiSummaryResult) {
      messageApi.error('请先生成AI总结');
      return;
    }

    // Remove thinking process content before saving
    const cleanedContent = removeThinkTags(aiSummaryResult);
    
    const blob = new Blob([cleanedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai_summary_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    messageApi.success('AI总结已保存');
  };

  const importSummaryToNotes = () => {
    if (!aiSummaryResult) {
      messageApi.error('请先生成AI总结');
      return;
    }

    // Remove thinking process content before importing
    const cleanedContent = removeThinkTags(aiSummaryResult);

    // 直接设置 Markdown 内容，让 Milkdown 编辑器处理
    setNotes(cleanedContent);
    setActiveTab('notes');
    messageApi.success('AI总结已导入到笔记');
  };

  const copyAISummary = () => {
    navigator.clipboard.writeText(aiSummaryResult).then(() => {
      messageApi.success('AI总结已复制到剪贴板');
    }).catch(() => {
      messageApi.error('复制失败');
    });
  };

  return {
    showAISummary,
    setShowAISummary,
    activeTab,
    setActiveTab,
    notes,
    setNotes,
    aiModel,
    setAiModel,
    systemPrompt,
    setSystemPrompt,
    userPrompt,
    setUserPrompt,
    aiSummaryResult,
    isGeneratingAI,
    availableModels,
    aiSummaryResultRef,
    handleAISummary,
    generateAISummary,
    saveNotes,
    saveAISummary,
    copyAISummary,
    importSummaryToNotes
  };
};

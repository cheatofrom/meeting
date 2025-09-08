import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Radio, Switch, Upload, Space, Card, Typography, message, App } from 'antd';
import { AudioOutlined, UploadOutlined, SettingOutlined } from '@ant-design/icons';
import { WebSocketService } from '../services/WebSocketService';
import { AudioRecorderService, type RecordingResult } from '../services/AudioRecorderService';
import { AudioUtils } from '../utils/AudioUtils';
import '../styles/ASRComponent.css';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

interface ASRComponentProps {
  defaultServerUrl?: string;
}

const ASRComponent: React.FC<ASRComponentProps> = ({ defaultServerUrl = 'ws://localhost:10095/wss/' }) => {
  const { message: messageApi } = App.useApp();
  // 状态管理
  const [serverUrl, setServerUrl] = useState<string>(defaultServerUrl);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recognitionText, setRecognitionText] = useState<string>('');
  const [onlineText, setOnlineText] = useState<string>(''); // 在线模式已确认文本
  const [offlineText, setOfflineText] = useState<string>(''); // 离线模式文本
  // 移除currentPartialText状态，改为与HTML5版本一致的简单累积逻辑
  const [asrMode, setAsrMode] = useState<string>('2pass');
  const [useITN, setUseITN] = useState<boolean>(true);
  const [isFileMode, setIsFileMode] = useState<boolean>(false);
  const [hotwords, setHotwords] = useState<string>('');
  const [recordedAudio, setRecordedAudio] = useState<RecordingResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  
  // Refs
  const webSocketServiceRef = useRef<WebSocketService | null>(null);
  const audioRecorderRef = useRef<AudioRecorderService | null>(null);
  const sampleBufferRef = useRef<Int16Array>(new Int16Array());
  
  // 初始化WebSocket服务
  useEffect(() => {
    webSocketServiceRef.current = new WebSocketService({
      msgHandle: handleWebSocketMessage,
      stateHandle: handleConnectionState,
      hotwords: hotwords,
      mode: asrMode
    });
    
    audioRecorderRef.current = new AudioRecorderService({
      onProcess: handleAudioProcess
    });
  }, []);
  
  // 监听onlineText变化，避免频繁重新渲染
  useEffect(() => {
    if (asrMode === 'online') {
      setRecognitionText(onlineText);
    }
  }, [onlineText, asrMode]);
  
  // 更新WebSocket配置当热词或模式改变时
  useEffect(() => {
    if (webSocketServiceRef.current) {
      webSocketServiceRef.current.updateConfig({
        hotwords: hotwords,
        mode: asrMode
      });
    }
  }, [hotwords, asrMode]);
  
  // 处理服务器URL变化
  useEffect(() => {
    
    // 添加切换协议事件监听器
    const handleToggleProtocol = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.action === 'toggle') {
        if (serverUrl.startsWith('wss://')) {
          const newUrl = serverUrl.replace('wss://', 'ws://');
          setServerUrl(newUrl);
          console.log('已切换到WS协议:', newUrl);
        } else if (serverUrl.startsWith('ws://')) {
          const newUrl = serverUrl.replace('ws://', 'wss://');
          setServerUrl(newUrl);
          console.log('已切换到WSS协议:', newUrl);
        }
      }
    };
    
    // 添加重试连接事件监听器
    const handleRetryConnection = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.action === 'retry') {
        console.log('尝试重新连接...');
        // 短暂延迟后重新连接
        setTimeout(() => {
          connectWebSocket();
        }, 500);
      }
    };
    
    document.addEventListener('toggle-ws-protocol', handleToggleProtocol);
    document.addEventListener('retry-connection', handleRetryConnection);
    
    return () => {
      disconnectWebSocket();
      stopRecording();
      // 清理音频URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      document.removeEventListener('toggle-ws-protocol', handleToggleProtocol);
      document.removeEventListener('retry-connection', handleRetryConnection);
    };
  }, [serverUrl]);
  
  // 处理WebSocket消息
  const handleWebSocketMessage = (event: MessageEvent) => {
    console.log('🔔 收到WebSocket消息:', event.data);
    console.log('🔔 消息类型:', typeof event.data);
    console.log('🔔 消息长度:', event.data?.length || 0);
    
    try {
      const data = JSON.parse(event.data);
      console.log('📋 解析后的消息数据:', JSON.stringify(data, null, 2));
      console.log('📋 消息包含的字段:', Object.keys(data));
      
      if (data.text) {
        const rectxt = data.text;
        const asrmodel = data.mode;
        const is_final = data.is_final;
        const timestamp = data.timestamp;
        
        console.log('✅ 识别到的文字:', `"${rectxt}"`);
        console.log('✅ ASR模式:', asrmodel);
        console.log('✅ 是否最终结果:', is_final);
        console.log('✅ 时间戳:', timestamp);
        
        // 根据html5示例的逻辑处理识别结果
        if (asrmodel === "2pass-offline" || asrmodel === "offline") {
          // 离线模式：累积到离线文本变量，然后设置显示文本为离线文本
          console.log('🔄 离线模式：累积文本');
          setOfflineText(prev => {
            const newText = prev + rectxt;
            console.log('🔄 离线模式累积后的文本:', `"${newText}"`);
            // 离线模式：显示文本 = 离线文本（与HTML5版本一致：rec_text=offline_text）
            setRecognitionText(newText);
            return newText;
          });
        } else {
          // 在线模式：与HTML5版本一致，直接累积所有识别结果（不区分临时和最终）
          console.log('🔄 在线模式：累积识别文本（与HTML5版本一致）');
          setOnlineText(prev => {
            const newText = prev + rectxt;
            console.log('🔄 在线模式累积后的文本:', `"${newText}"`);
            return newText;
          });
        }
      } else {
        console.warn('⚠️ 消息中没有text字段，完整消息:', data);
        // 检查是否有其他可能的字段
        if (data.result) {
          console.log('🔍 发现result字段:', data.result);
        }
        if (data.partial) {
          console.log('🔍 发现partial字段:', data.partial);
        }
        if (data.final) {
          console.log('🔍 发现final字段:', data.final);
        }
      }
    } catch (error) {
      console.error('❌ 解析WebSocket消息失败:', error);
      console.error('❌ 原始数据:', event.data);
      console.error('❌ 数据类型:', typeof event.data);
    }
  };
  
  // 处理连接状态变化
  const handleConnectionState = (state: number) => {
    console.log('=== WebSocket连接状态变化 ===');
    console.log('状态码:', state);
    console.log('当前时间:', new Date().toLocaleTimeString());
    console.log('WebSocket服务实例:', !!webSocketServiceRef.current);
    
    // 检查实际连接状态
    const actualConnected = webSocketServiceRef.current?.isConnected() || false;
    console.log('实际连接状态:', actualConnected);
    
    switch (state) {
      case 0: // 连接成功
        console.log('✅ 连接成功！');
        setIsConnected(true);
        messageApi.success('WebSocket连接成功');
        
        // 延迟检查连接状态
        setTimeout(() => {
          const delayedCheck = webSocketServiceRef.current?.isConnected() || false;
          console.log('🔍 延迟检查连接状态:', delayedCheck);
        }, 1000);
        break;
      case 1: // 连接关闭
        console.log('❌ 连接关闭');
        setIsConnected(false);
        messageApi.info('WebSocket连接已关闭');
        break;
      case 2: // 连接错误
        console.log('🚫 连接错误');
        setIsConnected(false);
        messageApi.error('WebSocket连接失败');
        break;
      default:
        break;
    }
    console.log('=== 状态处理完成 ===');
  };
  
  // 处理音频数据
  const handleAudioProcess = (buffer: Int16Array, powerLevel: number, bufferDuration: number, bufferSampleRate: number) => {
    const wsService = webSocketServiceRef.current;
    const wsActuallyConnected = wsService && wsService.isConnected();
    const recorderState = audioRecorderRef.current?.getRecordingState() || false;
    
    console.log('🎤 收到音频数据:', {
      bufferLength: buffer.length,
      powerLevel: powerLevel.toFixed(4),
      duration: bufferDuration,
      sampleRate: bufferSampleRate,
      reactIsRecording: isRecording,
      recorderIsRecording: recorderState,
      isConnected: isConnected,
      wsConnected: !!wsService,
      wsActuallyConnected: wsActuallyConnected
    });
    
    if (!wsActuallyConnected) {
      console.warn('⚠️ WebSocket实际未连接，跳过音频处理');
      return;
    }
    
    if (!recorderState) {
      console.warn('⚠️ 录音器未在录音状态，跳过音频处理');
      return;
    }
    
    console.log('✅ 音频处理条件满足，继续处理音频数据');
    
    console.log('📊 处理音频数据，缓冲区大小:', buffer.length, '音量:', powerLevel.toFixed(3), '采样率:', bufferSampleRate);
    
    // 重采样到16kHz（与HTML5版本保持一致）
    let processedBuffer = buffer;
    if (bufferSampleRate !== 16000) {
      console.log('🔄 重采样音频数据从', bufferSampleRate, 'Hz 到 16000Hz');
      processedBuffer = AudioUtils.resampleAudio(buffer, bufferSampleRate, 16000);
      console.log('✅ 重采样完成，原始长度:', buffer.length, '重采样后长度:', processedBuffer.length);
    }
    
    // 合并音频数据
    const oldLength = sampleBufferRef.current.length;
    const newBuffer = new Int16Array(oldLength + processedBuffer.length);
    newBuffer.set(sampleBufferRef.current);
    newBuffer.set(processedBuffer, oldLength);
    sampleBufferRef.current = newBuffer;
    
    console.log('🔄 音频数据累积:', {
      oldLength: oldLength,
      newDataLength: processedBuffer.length,
      originalDataLength: buffer.length,
      totalLength: sampleBufferRef.current.length
    });
    
    // 按照html5示例的方式处理和发送音频数据
    const chunk_size = 960; // for asr chunk_size [5, 10, 5]
    
    // 发送音频数据块
    while (sampleBufferRef.current.length >= chunk_size) {
      const sendBuf = sampleBufferRef.current.slice(0, chunk_size);
      sampleBufferRef.current = sampleBufferRef.current.slice(chunk_size);
      
      if (webSocketServiceRef.current) {
        console.log('📤 发送音频块:', {
          chunkSize: sendBuf.length,
          remainingBuffer: sampleBufferRef.current.length,
          wsReadyState: (webSocketServiceRef.current as any).speechSocket?.readyState
        });
        
        try {
          // 发送Int16Array数据，而不是ArrayBuffer
          webSocketServiceRef.current.wsSend(sendBuf);
          console.log('✅ 音频块发送成功，大小:', sendBuf.length, 'samples');
        } catch (error) {
          console.error('❌ 发送音频块失败:', error);
        }
      } else {
        console.warn('⚠️ WebSocket服务未初始化');
        break;
      }
    }
  };
  
  // 连接WebSocket
  const connectWebSocket = async () => {
    if (!webSocketServiceRef.current) return;
    
    console.log('=== 开始连接WebSocket服务器 ===');
    console.log('服务器URL:', serverUrl);
    const result = await webSocketServiceRef.current.wsStart(serverUrl);
    console.log('连接结果:', result);
    console.log('=== WebSocket连接过程完成 ===');
  };
  
  // 断开WebSocket连接
  const disconnectWebSocket = () => {
    if (webSocketServiceRef.current) {
      webSocketServiceRef.current.wsStop();
      setIsConnected(false);
    }
  };
  
  // 开始录音
  const startRecording = async () => {
    console.log('=== 开始录音流程 ===');
    console.log('当前连接状态:', isConnected);
    console.log('WebSocket实际连接状态:', webSocketServiceRef.current?.isConnected());
    console.log('录音器实例:', !!audioRecorderRef.current);
    
    if (!isConnected) {
      console.error('❌ 连接状态检查失败');
      message.error('请先连接服务器');
      return;
    }
    
    if (!audioRecorderRef.current) {
      console.error('❌ 录音器未初始化');
      return;
    }
    
    console.log('🎤 调用录音器开始录音...');
    try {
      const success = await audioRecorderRef.current.start();
      console.log('录音器启动结果:', success);
      
      if (success) {
        setIsRecording(true);
        sampleBufferRef.current = new Int16Array();
        console.log('✅ 录音已开始，状态已更新为:', true);
        message.success('开始录音');
        
        // 延迟检查录音状态
         setTimeout(() => {
           console.log('🔍 延迟检查录音状态 - React状态:', isRecording);
           console.log('🔍 延迟检查录音状态 - 录音器内部状态:', audioRecorderRef.current?.getRecordingState());
         }, 500);
      } else {
        console.error('❌ 录音器启动失败');
        message.error('启动录音失败');
      }
    } catch (error) {
      console.error('❌ 录音启动异常:', error);
      message.error('录音启动异常');
    }
    console.log('=== 录音流程结束 ===');
  };
  
  // 停止录音
  const stopRecording = () => {
    console.log('准备停止录音...');
    if (audioRecorderRef.current) {
      const result = audioRecorderRef.current.stop();
      setIsRecording(false);
      
      if (result) {
        console.log('录音已停止，获得录音数据:', {
          duration: result.duration,
          dataLength: result.audioData.length,
          sampleRate: result.sampleRate
        });
        
        // 保存录音结果
        setRecordedAudio(result);
        
        // 创建音频URL用于播放
        if (result.blob) {
          // 清理之前的URL
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
          }
          
          const newAudioUrl = URL.createObjectURL(result.blob);
          setAudioUrl(newAudioUrl);
          console.log('音频URL已创建:', newAudioUrl);
          message.success(`录音完成！时长: ${result.duration.toFixed(1)}秒`);
        }
      } else {
        console.log('录音已停止，但未获得录音数据');
      }
    }
  };
  
  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    if (!isConnected) {
      message.error('请先连接服务器');
      return false;
    }
    
    // 检查文件类型
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !['wav', 'mp3', 'pcm'].includes(fileExt)) {
      message.error('仅支持WAV、MP3或PCM格式的音频文件');
      return false;
    }
    
    try {
      // 读取文件
      const arrayBuffer = await file.arrayBuffer();
      
      // 处理不同格式的文件
      let pcmData: Int16Array;
      let sampleRate = 16000;
      
      if (fileExt === 'wav') {
        const result = AudioUtils.wavToPcm(arrayBuffer);
        pcmData = result.pcmData;
        sampleRate = result.sampleRate;
      } else if (fileExt === 'pcm') {
        pcmData = new Int16Array(arrayBuffer);
      } else {
        // MP3需要先解码，这里简化处理
        message.error('暂不支持MP3格式，请上传WAV或PCM格式的文件');
        return false;
      }
      
      // 重采样到16kHz
      if (sampleRate !== 16000) {
        pcmData = AudioUtils.resampleAudio(pcmData, sampleRate, 16000);
      }
      
      // 发送文件数据
      if (webSocketServiceRef.current) {
        // 发送初始化请求
        const request = {
          chunk_size: [5, 10, 5],
          wav_name: file.name,
          is_speaking: true,
          chunk_interval: 10,
          itn: useITN,
          mode: asrMode,
          wav_format: fileExt === 'wav' ? 'PCM' : fileExt,
          audio_fs: 16000,
          hotwords: hotwords ? hotwords.split(',').map(word => word.trim()) : undefined
        };
        
        webSocketServiceRef.current.sendInitialRequest(request);
        
        // 发送音频数据
        webSocketServiceRef.current.wsSend(pcmData.buffer);
        
        message.success('文件上传成功，正在处理...');
      }
    } catch (error) {
      console.error('处理文件失败:', error);
      message.error('处理文件失败');
    }
    
    return false; // 阻止默认上传行为
  };
  
  // 切换协议
  const toggleWsProtocol = () => {
    if (serverUrl.startsWith('wss://')) {
      setServerUrl(serverUrl.replace('wss://', 'ws://'));
      message.info('已切换到WS协议（不安全但可能解决证书问题）');
    } else if (serverUrl.startsWith('ws://')) {
      setServerUrl(serverUrl.replace('ws://', 'wss://'));
      message.info('已切换到WSS协议（安全连接）');
    }
  };
  
  // 生成授权链接
  const getAuthLink = () => {
    return serverUrl.replace(/wss/g, 'https').replace(/ws:/g, 'https:');
  };
  
  return (
    <div className="asr-container">
      <Card className="asr-card">
        <Title level={2}>FunASR 语音识别</Title>
        
        <div className="server-config">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
              <Input 
                addonBefore="服务器地址" 
                value={serverUrl} 
                onChange={(e) => setServerUrl(e.target.value)} 
                style={{ width: 350 }}
                disabled={isConnected}
              />
              <Button onClick={toggleWsProtocol} disabled={isConnected}>切换协议</Button>
            </Space>
            
            <Space>
              <a href={getAuthLink()} target="_blank" rel="noopener noreferrer">
                点此手动授权SSL证书（iOS设备可能需要）
              </a>
            </Space>
          </Space>
        </div>
        
        <div className="control-panel">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space wrap>
              <Radio.Group value={asrMode} onChange={(e) => setAsrMode(e.target.value)} disabled={isConnected}>
                <Radio.Button value="2pass">2pass模式</Radio.Button>
                <Radio.Button value="offline">离线模式</Radio.Button>
                <Radio.Button value="online">在线模式</Radio.Button>
              </Radio.Group>
              
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
                onClick={isConnected ? disconnectWebSocket : connectWebSocket}
              >
                {isConnected ? '断开连接' : '连接服务器'}
              </Button>
              
              <Button 
                 onClick={() => {
                   console.log('=== 手动调试信息 ===');
                   console.log('当前时间:', new Date().toLocaleString());
                   console.log('连接状态:', isConnected);
                   console.log('录音状态:', isRecording);
                   console.log('文件模式:', isFileMode);
                   console.log('服务器地址:', serverUrl);
                   console.log('ASR模式:', asrMode);
                   console.log('使用ITN:', useITN);
                   console.log('热词:', hotwords);
                   console.log('WebSocket服务:', webSocketServiceRef.current ? '已初始化' : '未初始化');
                   console.log('音频录制服务:', audioRecorderRef.current ? '已初始化' : '未初始化');
                   console.log('录音按钮禁用条件:', !isConnected || isFileMode);
                   console.log('上传按钮禁用条件:', !isConnected || isRecording);
                   if (webSocketServiceRef.current && (webSocketServiceRef.current as any).speechSocket) {
                     const ws = (webSocketServiceRef.current as any).speechSocket;
                     console.log('WebSocket readyState:', ws.readyState);
                     console.log('WebSocket URL:', ws.url);
                   }
                   console.log('=== 调试信息结束 ===');
                   messageApi.info('调试信息已输出到控制台');
                 }}
               >
                 调试信息
               </Button>
               
               <Button 
                 onClick={() => {
                   console.log('=== 测试WebSocket连接 ===');
                   if (webSocketServiceRef.current) {
                     console.log('强制触发连接测试...');
                     connectWebSocket();
                   } else {
                     console.log('WebSocket服务未初始化');
                   }
                 }}
               >
                 测试连接
               </Button>
              
              <Button 
                type="primary" 
                icon={<AudioOutlined />} 
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!isConnected}
              >
                {isRecording ? '停止录音' : '开始录音'}
              </Button>
              
              <Upload 
                beforeUpload={handleFileUpload} 
                showUploadList={false}
                disabled={!isConnected || isRecording}
              >
                <Button icon={<UploadOutlined />} disabled={!isConnected || isRecording}>
                  上传音频文件
                </Button>
              </Upload>
              
              <Button 
                onClick={() => {
                  setRecognitionText('');
                  setOnlineText('');
                  setOfflineText('');
                  // 清理录音数据
                  if (audioUrl) {
                    URL.revokeObjectURL(audioUrl);
                  }
                  setAudioUrl('');
                  setRecordedAudio(null);
                  console.log('🧹 已清空识别文本和录音数据');
                  message.success('已清空识别结果和录音');
                }}
              >
                清空全部
              </Button>
            </Space>
          </Space>
        </div>
        
        <div className="result-panel">
          <Title level={4}>识别结果</Title>
          <TextArea 
            value={recognitionText} 
            autoSize={{ minRows: 4, maxRows: 10 }} 
            readOnly 
          />
        </div>
        
        {/* 音频播放面板 */}
        {audioUrl && (
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
                  onClick={() => {
                    if (recordedAudio?.blob) {
                      const link = document.createElement('a');
                      link.href = audioUrl;
                      link.download = `recording_${new Date().getTime()}.wav`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      message.success('音频文件已下载');
                    }
                  }}
                >
                  下载音频
                </Button>
                
                <Button 
                  size="small"
                  onClick={() => {
                    if (audioUrl) {
                      URL.revokeObjectURL(audioUrl);
                    }
                    setAudioUrl('');
                    setRecordedAudio(null);
                    message.success('已清除录音');
                  }}
                >
                  清除录音
                </Button>
              </Space>
            </Space>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ASRComponent;
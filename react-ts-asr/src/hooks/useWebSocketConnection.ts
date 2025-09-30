import { useRef, useEffect, useState } from 'react';
import { App } from 'antd';
import { WebSocketService } from '../services/WebSocketService';
import { AudioUtils } from '../utils/AudioUtils';

export const useWebSocketConnection = (defaultServerUrl: string, hotwords: string, recordingMode?: 'microphone' | 'system') => {
  const { message: messageApi } = App.useApp();
  const [serverUrl, setServerUrl] = useState<string>(defaultServerUrl);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [recognitionText, setRecognitionText] = useState<string>('');
  const [historyText, setHistoryText] = useState<string>(''); // 历史完成的文本
  const [currentText, setCurrentText] = useState<string>(''); // 当前正在识别的文本
  const webSocketServiceRef = useRef<WebSocketService | null>(null);
  const sampleBufferRef = useRef<Int16Array>(new Int16Array());

  // 使用ref来跟踪历史文本，避免闭包问题
  const historyTextRef = useRef<string>('');

  const handleWebSocketMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);

      if (data.text) {
        const rectxt = data.text;

        if (rectxt.trim().length > 0) {
          // 根据模式区分处理方式
          if (data.mode && data.mode.includes('online')) {
            // 在线识别：更新当前识别文本（实时变化）
            setCurrentText(rectxt);
            // 更新总的显示文本：历史文本 + 当前文本
            const newText = historyTextRef.current + rectxt;
            setRecognitionText(newText);
          } else if (data.mode && data.mode.includes('offline')) {
            // 离线识别：将完成的文本添加到历史中，清空当前文本
            const newHistory = historyTextRef.current + rectxt;
            historyTextRef.current = newHistory;
            setHistoryText(newHistory);
            setCurrentText('');
            setRecognitionText(newHistory);
          } else {
            // 默认情况：累加显示（保持原有行为）
            setRecognitionText(prev => prev + rectxt);
          }
          
          console.log(`[WebSocket] 收到消息 - 模式: ${data.mode}, 文本: ${rectxt}, is_final: ${data.is_final}`);
        }
      }
    } catch (error) {
      console.error('解析WebSocket消息失败:', error);
    }
  };

  // 使用ref来跟踪是否已经显示过连接成功消息
  const hasShownSuccessMessageRef = useRef<boolean>(false);

  const handleConnectionState = (state: number) => {
    switch (state) {
      case 0:
        setIsConnected(true);
        // 只在第一次连接成功时显示消息
        if (!hasShownSuccessMessageRef.current) {
          messageApi.success('WebSocket连接成功');
          hasShownSuccessMessageRef.current = true;
        } else {
          console.log('[WebSocket] 已经显示过连接成功消息，跳过重复显示');
        }
        break;
      case 1:
        setIsConnected(false);
        messageApi.info('WebSocket连接已关闭');
        // 连接关闭后重置标志，允许下次连接时再次显示成功消息
        hasShownSuccessMessageRef.current = false;
        break;
      case 2:
        setIsConnected(false);
        messageApi.error('WebSocket连接失败');
        break;
      default:
        break;
    }
  };

  const handleAudioProcess = (buffer: Int16Array, _powerLevel: number, _bufferDuration: number, bufferSampleRate: number) => {
    const wsService = webSocketServiceRef.current;
    const wsActuallyConnected = wsService && wsService.isConnected();

    if (!wsActuallyConnected) {
      return;
    }

    let processedBuffer = buffer;
    if (bufferSampleRate !== 16000) {
      processedBuffer = AudioUtils.resampleAudio(buffer, bufferSampleRate, 16000);
    }

    const oldLength = sampleBufferRef.current.length;
    const newBuffer = new Int16Array(oldLength + processedBuffer.length);
    newBuffer.set(sampleBufferRef.current);
    newBuffer.set(processedBuffer, oldLength);
    sampleBufferRef.current = newBuffer;

    const chunk_size = 960;
    
    console.log(`[WebSocket] 接收音频数据 - 原始长度: ${buffer.length}, 处理后长度: ${processedBuffer.length}, 缓冲区总长度: ${sampleBufferRef.current.length}`);

    while (sampleBufferRef.current.length >= chunk_size) {
      const sendBuf = sampleBufferRef.current.slice(0, chunk_size);
      sampleBufferRef.current = sampleBufferRef.current.slice(chunk_size);

      if (webSocketServiceRef.current) {
        try {
          console.log(`[WebSocket] 发送音频块 - 大小: ${sendBuf.length}, 剩余缓冲区: ${sampleBufferRef.current.length}`);
          webSocketServiceRef.current.wsSend(sendBuf);
        } catch (error) {
          console.error('发送音频块失败:', error);
        }
      } else {
        break;
      }
    }
  };

  useEffect(() => {
    webSocketServiceRef.current = new WebSocketService({
      msgHandle: handleWebSocketMessage,
      stateHandle: handleConnectionState,
      hotwords: hotwords,
      mode: 'online',
      recordingMode: recordingMode || 'microphone'
    });

    const handleToggleProtocol = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.action === 'toggle') {
        if (serverUrl.startsWith('wss://')) {
          setServerUrl(serverUrl.replace('wss://', 'ws://'));
        } else if (serverUrl.startsWith('ws://')) {
          setServerUrl(serverUrl.replace('ws://', 'wss://'));
        }
      }
    };

    const handleRetryConnection = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.action === 'retry') {
        setTimeout(() => {
          connectWebSocket();
        }, 500);
      }
    };

    // 页面卸载时自动断开连接
    const handleBeforeUnload = () => {
      disconnectWebSocket();
    };

    // 页面可见性变化处理（保持连接活跃，仅在页面重新获得焦点时尝试重连）
    const handleVisibilityChange = () => {
      if (!document.hidden && webSocketServiceRef.current && !webSocketServiceRef.current.isConnected()) {
        // 页面重新获得焦点且WebSocket未连接时，尝试重连
        console.log('[WebSocket] 页面重新获得焦点，尝试重连WebSocket');
        setTimeout(() => {
          connectWebSocket();
        }, 500);
      }
    };

    document.addEventListener('toggle-ws-protocol', handleToggleProtocol);
    document.addEventListener('retry-connection', handleRetryConnection);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 自动连接WebSocket服务器
    setTimeout(() => {
      connectWebSocket();
    }, 100);

    return () => {
      disconnectWebSocket();
      document.removeEventListener('toggle-ws-protocol', handleToggleProtocol);
      document.removeEventListener('retry-connection', handleRetryConnection);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (webSocketServiceRef.current) {
      webSocketServiceRef.current.updateConfig({
        hotwords: hotwords,
        mode: '2pass'
      });
    }
  }, [hotwords]);

  const connectWebSocket = () => {
    if (!webSocketServiceRef.current) return;
    // 检查是否已经连接，避免重复连接
    if (webSocketServiceRef.current.isConnected()) {
      console.log('[WebSocket] 已经连接，跳过重复连接');
      return;
    }
    webSocketServiceRef.current.wsStart(serverUrl);
  };

  const disconnectWebSocket = () => {
    if (webSocketServiceRef.current) {
      webSocketServiceRef.current.wsStop();
      setIsConnected(false);
    }
  };

  const clearRecognitionText = () => {
    setRecognitionText('');
    setHistoryText('');
    setCurrentText('');
    historyTextRef.current = '';
    messageApi.success('已清除识别文本');
  };

  const resetSampleBuffer = () => {
    sampleBufferRef.current = new Int16Array();
  };

  return {
    serverUrl,
    setServerUrl,
    isConnected,
    recognitionText,
    historyText,
    currentText,
    connectWebSocket,
    disconnectWebSocket,
    clearRecognitionText,
    handleAudioProcess,
    resetSampleBuffer,
    webSocketServiceRef
  };
};
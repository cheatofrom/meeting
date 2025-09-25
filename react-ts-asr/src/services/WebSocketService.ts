/**
 * Copyright FunASR (https://github.com/alibaba-damo-academy/FunASR). All Rights
 * Reserved. MIT License  (https://opensource.org/licenses/MIT)
 */

export interface WebSocketConfig {
  msgHandle: (event: MessageEvent) => void;
  stateHandle: (state: number) => void;
  hotwords?: string;
  mode?: string;
}

export interface ASRRequest {
  chunk_size: number[];
  wav_name: string;
  is_speaking: boolean;
  chunk_interval: number;
  itn?: boolean;
  mode?: string;
  wav_format?: string;
  audio_fs?: number;
  hotwords?: string[];
}

export class WebSocketService {
  private speechSocket: WebSocket | undefined;
  private msgHandle: (event: MessageEvent) => void;
  private stateHandle: (state: number) => void;
  private infoDivElement: HTMLElement | null;
  private config: WebSocketConfig;

  constructor(config: WebSocketConfig) {
    this.config = config;
    this.msgHandle = config.msgHandle;
    this.stateHandle = config.stateHandle;
    this.infoDivElement = document.getElementById('info_div');
  }

  updateConfig(newConfig: Partial<WebSocketConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.msgHandle) {
      this.msgHandle = newConfig.msgHandle;
    }
    if (newConfig.stateHandle) {
      this.stateHandle = newConfig.stateHandle;
    }
  }

  public wsStart(serverUrl: string): number {
    if (!serverUrl.match(/wss:\S*|ws:\S*/)) {
      alert('请检查wss地址正确性');
      return 0;
    }

    let url = serverUrl;
    
    if ('WebSocket' in window) {
      try {
        this.speechSocket = new WebSocket(url);
        
        this.speechSocket.onopen = (e) => {
          this.onOpen(e);
        };
        
        this.speechSocket.onclose = (e) => {
          this.onClose(e);
        };
        
        this.speechSocket.onmessage = (e) => {
          this.onMessage(e);
        };
        
        this.speechSocket.onerror = (e) => {
          this.onError(e);
        };
        
        return 1;
      } catch (error) {
        console.error('WebSocket连接错误:', error);
        this.stateHandle(2); // 连接错误状态
        if (this.infoDivElement) {
          this.infoDivElement.innerHTML = `连接失败: ${error}`;
        }
        return 0;
      }
    } else {
      alert('当前浏览器不支持 WebSocket');
      return 0;
    }
  }

  public wsStop(): void {
    if (this.speechSocket) {
      this.speechSocket.close();
    }
  }

  public isConnected(): boolean {
    return this.speechSocket !== undefined && this.speechSocket.readyState === 1;
  }

  public wsSend(data: string | ArrayBuffer | Int16Array): void {
    if (!this.speechSocket) {
      return;
    }
    
    if (this.speechSocket.readyState === 1) { // 0:CONNECTING, 1:OPEN, 2:CLOSING, 3:CLOSED
      if (data instanceof ArrayBuffer) {
        try {
          this.speechSocket.send(data);
        } catch (error) {
          console.error('发送ArrayBuffer音频数据失败:', error);
        }
      } else if (data instanceof Int16Array) {
        try {
          // 发送Int16Array的buffer
          this.speechSocket.send(data.buffer);
        } catch (error) {
          console.error('发送Int16Array音频数据失败:', error);
        }
      } else {
        this.speechSocket.send(data);
      }
    }
  }

  public sendInitialRequest(request: ASRRequest): void {
    if (this.speechSocket && this.speechSocket.readyState === 1) {
      this.speechSocket.send(JSON.stringify(request));
    }
  }

  private onOpen(_e: Event): void {
    this.stateHandle(0); // 连接成功状态
    
    // 发送初始化配置
    const initialRequest = {
      "chunk_size": [5, 10, 5],
      "wav_name": "microphone",
      "is_speaking": true,
      "chunk_interval": 10,
      "itn": false,
      "mode": "2pass", // 固定使用2pass模式
      "wav_format": "pcm",
      "audio_fs": 16000,
      "hotwords": this.config.hotwords ? this.config.hotwords.split(',').map(w => w.trim()) : []
    };
    
    try {
      this.speechSocket?.send(JSON.stringify(initialRequest));
    } catch (error) {
      console.error('发送初始化配置失败:', error);
    }
  }

  private onClose(_e: CloseEvent): void {
    this.stateHandle(1);
  }

  private onMessage(e: MessageEvent): void {
    try {
      JSON.parse(e.data); // 解析但不存储到变量
      this.msgHandle(e);
    } catch (error) {
      console.error('解析WebSocket消息失败:', error);
      this.msgHandle(e);
    }
  }

  private onError(e: Event): void {
    console.error('WebSocket连接错误:', e);
    
    // 自动尝试切换协议并重连
    const currentUrl = this.speechSocket?.url || '';
    
    if (this.infoDivElement) {
      if (currentUrl.startsWith('wss://')) {
        this.infoDivElement.innerHTML = '连接错误: WSS协议连接失败，可能是SSL证书问题，正在尝试切换到WS协议...';
        
        // 通知应用切换协议
        setTimeout(() => {
          const event = new CustomEvent('toggle-ws-protocol', { detail: { action: 'toggle' } });
          document.dispatchEvent(event);
          
          if (this.infoDivElement) {
            this.infoDivElement.innerHTML = '已自动切换到WS协议，请重新连接';
            
            // 添加切换回WSS的按钮
            const toggleButton = document.createElement('button');
            toggleButton.textContent = '切换回WSS协议';
            toggleButton.style.marginTop = '10px';
            toggleButton.style.padding = '5px 10px';
            toggleButton.style.backgroundColor = '#1890ff';
            toggleButton.style.color = 'white';
            toggleButton.style.border = 'none';
            toggleButton.style.borderRadius = '4px';
            toggleButton.style.cursor = 'pointer';
            toggleButton.onclick = () => {
              const event = new CustomEvent('toggle-ws-protocol', { detail: { action: 'toggle' } });
              document.dispatchEvent(event);
              
              if (this.infoDivElement) {
                this.infoDivElement.innerHTML = '已切换回WSS协议，请重新连接';
              }
            };
            
            // 清除之前的按钮
            const oldButton = document.getElementById('toggle-protocol-button');
            if (oldButton) {
              oldButton.remove();
            }
            
            // 添加ID并追加到infoDivElement
            toggleButton.id = 'toggle-protocol-button';
            this.infoDivElement.appendChild(toggleButton);
          }
        }, 1000);
      } else if (currentUrl.startsWith('ws://')) {
        this.infoDivElement.innerHTML = '连接错误: WS协议连接失败，可能是服务器未运行或网络问题';
        
        // 添加重试按钮
        const retryButton = document.createElement('button');
        retryButton.textContent = '重试连接';
        retryButton.style.marginTop = '10px';
        retryButton.style.marginRight = '10px';
        retryButton.style.padding = '5px 10px';
        retryButton.style.backgroundColor = '#1890ff';
        retryButton.style.color = 'white';
        retryButton.style.border = 'none';
        retryButton.style.borderRadius = '4px';
        retryButton.style.cursor = 'pointer';
        retryButton.onclick = () => {
          if (this.infoDivElement) {
            this.infoDivElement.innerHTML = '正在重试连接...';
          }
          // 通知应用重新连接
          const event = new CustomEvent('retry-connection', { detail: { action: 'retry' } });
          document.dispatchEvent(event);
        };
        
        // 清除之前的按钮
        const oldButton = document.getElementById('retry-button');
        if (oldButton) {
          oldButton.remove();
        }
        
        // 添加ID并追加到infoDivElement
        retryButton.id = 'retry-button';
        this.infoDivElement.appendChild(retryButton);
        
        // 添加切换协议按钮
        const toggleButton = document.createElement('button');
        toggleButton.textContent = '切换到WSS协议';
        toggleButton.style.marginTop = '10px';
        toggleButton.style.padding = '5px 10px';
        toggleButton.style.backgroundColor = '#1890ff';
        toggleButton.style.color = 'white';
        toggleButton.style.border = 'none';
        toggleButton.style.borderRadius = '4px';
        toggleButton.style.cursor = 'pointer';
        toggleButton.onclick = () => {
          const event = new CustomEvent('toggle-ws-protocol', { detail: { action: 'toggle' } });
          document.dispatchEvent(event);
          
          if (this.infoDivElement) {
            this.infoDivElement.innerHTML = '已切换到WSS协议，请重新连接';
          }
        };
        
        // 清除之前的按钮
        const oldToggleButton = document.getElementById('toggle-protocol-button');
        if (oldToggleButton) {
          oldToggleButton.remove();
        }
        
        // 添加ID并追加到infoDivElement
        toggleButton.id = 'toggle-protocol-button';
        this.infoDivElement.appendChild(toggleButton);
      }
    }
    
    this.stateHandle(2);
  }
}
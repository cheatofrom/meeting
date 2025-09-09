# 会议语音识别系统 (Meeting ASR System)

一个基于 FunASR 的实时语音识别系统，支持在线/离线语音转文字，专为会议场景设计。

## 🚀 项目特性

- **实时语音识别**: 支持在线流式识别和离线批量识别
- **多种识别模式**: 
  - `online`: 在线流式识别，低延迟
  - `offline`: 离线批量识别，高精度
  - `2pass`: 两遍识别，兼顾速度和精度
- **语音活动检测 (VAD)**: 自动检测语音段落
- **标点符号预测**: 自动添加标点符号
- **热词支持**: 支持自定义热词提升识别准确率
- **文件上传识别**: 支持音频文件批量处理
- **WebSocket 通信**: 实时双向通信
- **SSL/TLS 支持**: 支持安全连接 (WSS)
- **现代化 UI**: 基于 React + TypeScript + Ant Design

## 🏗️ 系统架构

```
┌─────────────────┐    WebSocket     ┌─────────────────┐
│   React 前端    │ ◄──────────────► │  Python 后端    │
│                 │                  │                 │
│ • 音频录制      │                  │ • FunASR 模型   │
│ • 实时显示      │                  │ • VAD 检测      │
│ • 文件上传      │                  │ • 标点预测      │
└─────────────────┘                  └─────────────────┘
```

## 📦 技术栈

### 前端
- **React 19** + **TypeScript**
- **Vite** - 构建工具
- **Ant Design** - UI 组件库
- **WebSocket API** - 实时通信

### 后端
- **Python** + **asyncio**
- **FunASR** - 阿里达摩院语音识别框架
- **WebSockets** - 实时通信服务
- **PyTorch** - 深度学习框架

### AI 模型
- **Paraformer**: 语音识别主模型
- **FSMN-VAD**: 语音活动检测
- **CT-Transformer**: 标点符号预测
- **CAMPPlus**: 说话人识别 (可选)

## 🛠️ 安装部署

### 环境要求
- Python 3.8+
- Node.js 16+
- CUDA (可选，用于 GPU 加速)

### 1. 克隆项目
```bash
git clone <repository-url>
cd Meeting
```

### 2. 后端部署

#### 安装依赖
```bash
cd websocket
pip install -r requirements_server.txt
pip install -U modelscope funasr
```

#### 下载模型 (自动)
模型会在首次运行时自动下载到 `models/` 目录

#### 启动服务器
```bash
# 基础启动
python funasr_wss_server.py --port 10095

# 使用 SSL (推荐生产环境)
python funasr_wss_server.py --port 10095 \
  --certfile ../ssl_key/server.crt \
  --keyfile ../ssl_key/server.key

# 自定义模型路径
python funasr_wss_server.py --port 10095 \
  --asr_model ./models/speech_paraformer-large-vad-punc_asr_nat-zh-cn-16k-common-vocab8404-pytorch \
  --vad_model ./models/speech_fsmn_vad_zh-cn-16k-common-pytorch \
  --punc_model ./models/punc_ct-transformer_zh-cn-common-vad_realtime-vocab272727
```

### 3. 前端部署

```bash
cd react-ts-asr

# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build
npm run preview
```

## 🎯 使用方法

### 实时语音识别
1. 打开前端应用
2. 配置服务器地址 (默认: `wss://192.168.1.66:10095/`)
3. 点击连接服务器
4. 选择识别模式 (`online`/`offline`/`2pass`)
5. 点击开始录音
6. 实时查看识别结果

### 文件识别
1. 切换到文件模式
2. 上传音频文件 (支持 WAV, MP3 等格式)
3. 设置批处理参数
4. 开始识别
5. 下载识别结果

### 高级配置
- **热词设置**: 在热词输入框中添加专业术语，用逗号分隔
- **ITN 开关**: 控制是否进行逆文本标准化
- **批处理大小**: 调整文件识别的批处理时长

## 📁 项目结构

```
Meeting/
├── react-ts-asr/              # React 前端应用
│   ├── src/
│   │   ├── components/         # React 组件
│   │   ├── services/          # WebSocket 服务
│   │   ├── utils/             # 工具函数
│   │   └── styles/            # 样式文件
│   └── package.json
├── websocket/                  # Python 后端服务
│   ├── funasr_wss_server.py   # WebSocket 服务器
│   ├── funasr_api_server.py   # HTTP API 服务器
│   └── requirements_server.txt
├── models/                     # AI 模型目录
│   ├── speech_paraformer-large-vad-punc_asr_nat-zh-cn/
│   ├── speech_fsmn_vad_zh-cn-16k-common-pytorch/
│   └── punc_ct-transformer_zh-cn-common-vad_realtime-vocab272727/
├── ssl_key/                    # SSL 证书
│   ├── server.crt
│   └── server.key
└── test/                       # 测试文件
    └── 1112.wav
```

## ⚙️ 配置说明

### 服务器参数
- `--host`: 服务器地址 (默认: 0.0.0.0)
- `--port`: 端口号 (默认: 10095)
- `--ngpu`: GPU 数量 (0=CPU, 1=GPU)
- `--device`: 设备类型 (cuda/cpu)
- `--certfile`: SSL 证书文件路径
- `--keyfile`: SSL 私钥文件路径

### 前端配置
修改 `react-ts-asr/src/App.tsx` 中的 `defaultServerUrl` 参数

## 🔧 故障排除

### 常见问题

1. **连接失败**
   - 检查服务器是否启动
   - 确认端口号和协议 (ws/wss)
   - 检查防火墙设置

2. **音频录制问题**
   - 确保浏览器有麦克风权限
   - 检查音频设备是否正常
   - 尝试使用 HTTPS/WSS 协议

3. **识别精度问题**
   - 添加相关热词
   - 选择合适的识别模式
   - 确保音频质量良好

4. **GPU 内存不足**
   - 使用 CPU 模式 (`--ngpu 0`)
   - 减少批处理大小
   - 清理 GPU 缓存

## 📄 许可证

本项目基于 MIT 许可证开源。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 联系方式

如有问题，请通过以下方式联系：
- 提交 GitHub Issue
- 发送邮件至项目维护者

---

**注意**: 首次运行时模型会自动下载，请确保网络连接正常。建议在生产环境中使用 SSL/TLS 加密连接。
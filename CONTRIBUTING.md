# 贡献指南 (Contributing Guide)

感谢您对会议语音识别系统项目的关注！我们欢迎所有形式的贡献。

## 🤝 如何贡献

### 报告问题 (Bug Reports)

在提交问题前，请：

1. **搜索现有问题**: 检查 [Issues](https://github.com/your-username/Meeting-ASR-System/issues) 中是否已有相关问题
2. **使用最新版本**: 确保使用的是最新版本
3. **提供详细信息**: 包含以下信息
   - 操作系统和版本
   - Python/Node.js版本
   - 浏览器版本 (如果是前端问题)
   - 错误信息和堆栈跟踪
   - 复现步骤
   - 预期行为 vs 实际行为

#### 问题模板

```markdown
**环境信息**
- OS: [e.g. Ubuntu 20.04]
- Python: [e.g. 3.9.7]
- Node.js: [e.g. 18.17.0]
- Browser: [e.g. Chrome 120.0]

**问题描述**
简洁清晰地描述问题。

**复现步骤**
1. 执行 '...'
2. 点击 '....'
3. 滚动到 '....'
4. 看到错误

**预期行为**
描述您期望发生的情况。

**实际行为**
描述实际发生的情况。

**截图**
如果适用，添加截图来帮助解释问题。

**附加信息**
添加任何其他相关信息。
```

### 功能请求 (Feature Requests)

1. **检查现有讨论**: 在 [Discussions](https://github.com/your-username/Meeting-ASR-System/discussions) 中搜索相关讨论
2. **详细描述需求**: 说明功能的用途和价值
3. **提供使用场景**: 具体的使用案例
4. **考虑实现方案**: 如果有想法，可以提供实现建议

### 代码贡献 (Code Contributions)

#### 开发环境设置

1. **Fork 项目**
   ```bash
   # 在GitHub上Fork项目，然后克隆到本地
   git clone https://github.com/your-username/Meeting-ASR-System.git
   cd Meeting-ASR-System
   ```

2. **创建开发分支**
   ```bash
   git checkout -b feature/your-feature-name
   # 或者
   git checkout -b fix/issue-number
   ```

3. **安装依赖**
   ```bash
   # 后端依赖
   cd websocket
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   
   # 前端依赖
   cd ../react-ts-asr
   npm install
   ```

4. **运行开发服务器**
   ```bash
   # 后端 (终端1)
   cd websocket
   python funasr_wss_server.py --port 10095
   
   # 前端 (终端2)
   cd react-ts-asr
   npm run dev
   ```

#### 代码规范

**Python 代码**
- 使用 [Black](https://black.readthedocs.io/) 进行代码格式化
- 使用 [Flake8](https://flake8.pycqa.org/) 进行代码检查
- 遵循 [PEP 8](https://www.python.org/dev/peps/pep-0008/) 规范
- 添加类型注解 (Type Hints)

```bash
# 格式化代码
black .
# 检查代码
flake8 .
# 类型检查
mypy .
```

**TypeScript/React 代码**
- 使用 [Prettier](https://prettier.io/) 进行代码格式化
- 使用 [ESLint](https://eslint.org/) 进行代码检查
- 遵循 React Hooks 最佳实践
- 使用 TypeScript 严格模式

```bash
# 格式化代码
npm run format
# 检查代码
npm run lint
# 类型检查
npm run type-check
```

**提交信息规范**
使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

类型 (type):
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

示例:
```
feat(asr): add support for English recognition
fix(websocket): resolve connection timeout issue
docs(readme): update installation instructions
```

#### 测试

**运行测试**
```bash
# 后端测试
cd websocket
python -m pytest tests/ -v

# 前端测试
cd react-ts-asr
npm test
```

**编写测试**
- 为新功能编写单元测试
- 确保测试覆盖率不低于80%
- 编写集成测试验证关键功能

#### 提交 Pull Request

1. **确保代码质量**
   - 所有测试通过
   - 代码格式化完成
   - 无 linting 错误

2. **更新文档**
   - 更新 README.md (如果需要)
   - 添加或更新 API 文档
   - 更新 CHANGELOG.md

3. **创建 Pull Request**
   - 使用清晰的标题和描述
   - 关联相关的 Issue
   - 添加适当的标签
   - 请求代码审查

#### PR 模板

```markdown
## 变更类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 重大变更
- [ ] 文档更新

## 变更描述
简洁地描述这个PR的变更内容。

## 相关Issue
关闭 #(issue编号)

## 测试
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 手动测试完成

## 检查清单
- [ ] 代码遵循项目规范
- [ ] 自我审查完成
- [ ] 添加了必要的注释
- [ ] 更新了相关文档
- [ ] 没有引入新的警告
```

## 📋 开发指南

### 项目结构

```
Meeting-ASR-System/
├── websocket/              # 后端服务
│   ├── funasr_wss_server.py   # WebSocket服务器
│   ├── tests/                 # 后端测试
│   └── requirements.txt       # Python依赖
├── react-ts-asr/           # 前端应用
│   ├── src/
│   │   ├── components/        # React组件
│   │   ├── services/          # 服务层
│   │   └── utils/             # 工具函数
│   └── package.json           # Node.js依赖
├── models/                 # AI模型存储
├── ssl_key/               # SSL证书
└── docs/                  # 项目文档
```

### 架构原则

1. **模块化**: 保持代码模块化，便于维护
2. **可测试性**: 编写可测试的代码
3. **性能优先**: 优化关键路径的性能
4. **用户体验**: 注重用户界面和交互体验
5. **安全性**: 遵循安全最佳实践

### 常见任务

**添加新的识别模式**
1. 在后端添加模式处理逻辑
2. 更新前端UI选项
3. 添加相应的测试
4. 更新文档

**优化性能**
1. 使用性能分析工具
2. 识别瓶颈
3. 实施优化方案
4. 验证改进效果

**修复Bug**
1. 复现问题
2. 编写失败的测试
3. 修复代码
4. 确保测试通过

## 🏆 贡献者认可

我们会在以下地方认可贡献者：
- README.md 中的贡献者列表
- 发布说明中的感谢
- 项目网站的贡献者页面

## 📞 获取帮助

如果您在贡献过程中遇到问题：

1. 查看现有的 [Issues](https://github.com/your-username/Meeting-ASR-System/issues)
2. 在 [Discussions](https://github.com/your-username/Meeting-ASR-System/discussions) 中提问
3. 发送邮件至 [your-email@example.com](mailto:your-email@example.com)

## 📜 行为准则

请遵循我们的 [行为准则](CODE_OF_CONDUCT.md)，营造友好包容的社区环境。

---

再次感谢您的贡献！🎉
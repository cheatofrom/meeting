#!/bin/bash

# 简单设置GitHub仓库描述
# 使用GitHub CLI

DESCRIPTION="🎙️ 基于FunASR的实时语音识别系统 - 支持会议记录、文件转录、AI智能总结"

# 检查GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "❌ 需要安装GitHub CLI: https://cli.github.com/"
    exit 1
fi

# 检查登录状态
if ! gh auth status &> /dev/null; then
    echo "❌ 请先登录: gh auth login"
    exit 1
fi

# 设置描述
echo "🔧 设置仓库描述..."
gh repo edit --description "$DESCRIPTION"

if [ $? -eq 0 ]; then
    echo "✅ 仓库描述设置成功"
    echo "📝 描述: $DESCRIPTION"
else
    echo "❌ 设置失败"
    exit 1
fi
#!/bin/bash

# GitHub仓库设置脚本
# 使用GitHub CLI设置仓库的About信息

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目配置
REPO_DESCRIPTION="🎙️ 基于FunASR的实时语音识别系统 - 支持会议记录、文件转录、AI智能总结"
REPO_HOMEPAGE="https://your-username.github.io/Meeting-ASR-System"
REPO_TOPICS="speech-recognition,funasr,websocket,react,typescript,ai,meeting,transcription,python,real-time,voice-to-text,chinese"

echo -e "${BLUE}🚀 GitHub仓库设置脚本${NC}"
echo "=================================="

# 检查GitHub CLI是否安装
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) 未安装${NC}"
    echo -e "${YELLOW}请先安装GitHub CLI: https://cli.github.com/${NC}"
    exit 1
fi

# 检查是否已登录GitHub
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ 未登录GitHub${NC}"
    echo -e "${YELLOW}请先登录: gh auth login${NC}"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI已安装并已登录${NC}"

# 获取当前仓库信息
REPO_INFO=$(gh repo view --json owner,name 2>/dev/null || echo "")
if [ -z "$REPO_INFO" ]; then
    echo -e "${RED}❌ 当前目录不是GitHub仓库或未推送到远程${NC}"
    echo -e "${YELLOW}请确保已经创建并推送到GitHub仓库${NC}"
    exit 1
fi

REPO_OWNER=$(echo "$REPO_INFO" | jq -r '.owner.login')
REPO_NAME=$(echo "$REPO_INFO" | jq -r '.name')

echo -e "${BLUE}📦 仓库信息: ${REPO_OWNER}/${REPO_NAME}${NC}"

# 设置仓库描述和主页
echo -e "${YELLOW}🔧 设置仓库描述和主页...${NC}"
gh repo edit --description "$REPO_DESCRIPTION" --homepage "$REPO_HOMEPAGE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 仓库描述和主页设置成功${NC}"
else
    echo -e "${RED}❌ 设置仓库描述和主页失败${NC}"
    exit 1
fi

# 设置仓库话题
echo -e "${YELLOW}🏷️  设置仓库话题...${NC}"
# GitHub CLI目前不直接支持设置topics，使用API
TOPICS_JSON=$(echo "$REPO_TOPICS" | sed 's/,/","/g' | sed 's/^/"/' | sed 's/$/"/')
TOPICS_PAYLOAD="{\"names\": [$TOPICS_JSON]}"

gh api repos/$REPO_OWNER/$REPO_NAME/topics \
    --method PUT \
    --field names="$REPO_TOPICS" \
    --header "Accept: application/vnd.github.mercy-preview+json" > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 仓库话题设置成功${NC}"
else
    echo -e "${RED}❌ 设置仓库话题失败${NC}"
fi

# 启用功能
echo -e "${YELLOW}⚙️  配置仓库功能...${NC}"

# 启用Issues
gh repo edit --enable-issues=true

# 启用Wiki
gh repo edit --enable-wiki=true

# 启用Projects
gh repo edit --enable-projects=true

echo -e "${GREEN}✅ 仓库功能配置完成${NC}"

# 显示当前设置
echo ""
echo -e "${BLUE}📋 当前仓库设置:${NC}"
echo "=================================="
gh repo view

echo ""
echo -e "${GREEN}🎉 GitHub仓库About信息设置完成！${NC}"
echo -e "${YELLOW}💡 提示: 你可以在GitHub网页上查看更新后的About部分${NC}"
echo -e "${BLUE}🔗 仓库地址: https://github.com/${REPO_OWNER}/${REPO_NAME}${NC}"
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
全局配置文件
部署时只需修改此文件中的 SERVER_HOST 即可
"""

import os

# ==================== 服务器地址配置 ====================
# 部署时修改此变量为你的服务器 IP 或域名
# 例如: "192.168.1.100" 或 "your-domain.com"
SERVER_HOST = os.environ.get("SERVER_HOST", "localhost")

# ==================== 端口配置 ====================
WSS_PORT = int(os.environ.get("WSS_PORT", "10095"))      # WebSocket 实时识别服务端口
API_PORT = int(os.environ.get("API_PORT", "10096"))      # HTTP API 服务端口
OLLAMA_PORT = int(os.environ.get("OLLAMA_PORT", "11434"))  # Ollama AI 服务端口

# ==================== 设备配置 ====================
import platform
IS_MACOS = platform.system() == "Darwin"
DEFAULT_DEVICE = os.environ.get("ASR_DEVICE", "cpu" if IS_MACOS else "cuda")
DEFAULT_NGPU = int(os.environ.get("ASR_NGPU", "0" if IS_MACOS else "1"))

# ==================== SSL 配置 ====================
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SSL_DIR = os.path.join(PROJECT_DIR, "ssl_key")
SSL_CERT = os.environ.get("ASR_SSL_CERT", os.path.join(SSL_DIR, "server.crt"))
SSL_KEY = os.environ.get("ASR_SSL_KEY", os.path.join(SSL_DIR, "server.key"))

# ==================== 模型路径配置 ====================
MODELS_DIR = os.path.join(PROJECT_DIR, "models")
ASR_MODEL = os.environ.get("ASR_MODEL", os.path.join(MODELS_DIR, "speech_paraformer-large-vad-punc_asr_nat-zh-cn-16k-common-vocab8404-pytorch"))
ASR_MODEL_ONLINE = os.environ.get("ASR_MODEL_ONLINE", os.path.join(MODELS_DIR, "speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-online"))
VAD_MODEL = os.environ.get("VAD_MODEL", os.path.join(MODELS_DIR, "speech_fsmn_vad_zh-cn-16k-common-pytorch"))
PUNC_MODEL = os.environ.get("PUNC_MODEL", os.path.join(MODELS_DIR, "punc_ct-transformer_zh-cn-common-vad_realtime-vocab272727"))
SPK_MODEL = os.environ.get("SPK_MODEL", os.path.join(MODELS_DIR, "speech_campplus_sv_zh-cn_16k-common"))

# ==================== 辅助函数 ====================
def get_wss_url(use_ssl: bool = True) -> str:
    """获取 WebSocket 服务地址"""
    protocol = "wss" if use_ssl else "ws"
    return f"{protocol}://{SERVER_HOST}:{WSS_PORT}"

def get_api_url(use_ssl: bool = True) -> str:
    """获取 API 服务地址"""
    protocol = "https" if use_ssl else "http"
    return f"{protocol}://{SERVER_HOST}:{API_PORT}"

def get_ollama_url() -> str:
    """获取 Ollama 服务地址"""
    return f"http://{SERVER_HOST}:{OLLAMA_PORT}"


# ==================== 打印当前配置（调试用）====================
def print_config():
    """打印当前配置信息"""
    print("=" * 50)
    print("当前服务器配置:")
    print(f"  SERVER_HOST: {SERVER_HOST}")
    print(f"  WSS_PORT: {WSS_PORT}")
    print(f"  API_PORT: {API_PORT}")
    print(f"  OLLAMA_PORT: {OLLAMA_PORT}")
    print(f"  DEVICE: {DEFAULT_DEVICE}")
    print(f"  NGPU: {DEFAULT_NGPU}")
    print(f"  WSS URL: {get_wss_url()}")
    print(f"  API URL: {get_api_url()}")
    print("=" * 50)


if __name__ == "__main__":
    print_config()

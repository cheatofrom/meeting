/**
 * 全局配置文件
 * 部署时只需修改此文件中的 SERVER_HOST 即可
 */

// ==================== 服务器地址配置 ====================
// 部署时修改此变量为你的服务器 IP 或域名
// 例如: "192.168.1.100" 或 "your-domain.com"
export const SERVER_HOST = "localhost";

// ==================== 端口配置 ====================
export const WSS_PORT = 10095;       // WebSocket 实时识别服务端口
export const API_PORT = 10096;       // HTTP API 服务端口
export const OLLAMA_PORT = 11434;    // Ollama AI 服务端口
export const FRONTEND_PORT = 5173;   // 前端开发服务器端口

// ==================== URL 生成函数 ====================

/**
 * 获取 WebSocket 服务地址
 */
export const getWssUrl = (useSsl: boolean = true): string => {
  const protocol = useSsl ? "wss" : "ws";
  return `${protocol}://${SERVER_HOST}:${WSS_PORT}`;
};

/**
 * 获取 API 服务地址
 */
export const getApiUrl = (useSsl: boolean = true): string => {
  const protocol = useSsl ? "https" : "http";
  return `${protocol}://${SERVER_HOST}:${API_PORT}`;
};

/**
 * 获取 Ollama 服务地址
 */
export const getOllamaUrl = (): string => {
  return `http://${SERVER_HOST}:${OLLAMA_PORT}`;
};

/**
 * 获取前端服务地址
 */
export const getFrontendUrl = (useSsl: boolean = true): string => {
  const protocol = useSsl ? "https" : "http";
  return `${protocol}://${SERVER_HOST}:${FRONTEND_PORT}`;
};

// ==================== 默认导出配置对象 ====================
const config = {
  SERVER_HOST,
  WSS_PORT,
  API_PORT,
  OLLAMA_PORT,
  FRONTEND_PORT,
  getWssUrl,
  getApiUrl,
  getOllamaUrl,
  getFrontendUrl,
};

export default config;

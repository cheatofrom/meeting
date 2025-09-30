/**
 * 错误日志记录工具
 * 用于统一处理和记录应用中的错误
 */

// 错误类型常量
export const ErrorType = {
  RENDER: 'render_error',
  API: 'api_error',
  PARSING: 'parsing_error',
  UNKNOWN: 'unknown_error'
} as const;

// 错误严重程度常量
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

// 类型定义
export type ErrorTypeValue = typeof ErrorType[keyof typeof ErrorType];
export type ErrorSeverityValue = typeof ErrorSeverity[keyof typeof ErrorSeverity];

// 错误日志接口
interface ErrorLog {
  type: ErrorTypeValue;
  message: string;
  timestamp: number;
  severity: ErrorSeverityValue;
  componentName?: string;
  details?: any;
}

// 存储错误日志的数组
const errorLogs: ErrorLog[] = [];

// 最大日志数量
const MAX_LOGS = 100;

/**
 * 记录错误
 * @param type 错误类型
 * @param message 错误消息
 * @param severity 错误严重程度
 * @param componentName 组件名称
 * @param details 详细信息
 */
export const logError = (
  type: ErrorTypeValue,
  message: string,
  severity: ErrorSeverityValue = ErrorSeverity.MEDIUM,
  componentName?: string,
  details?: any
): void => {
  // 创建错误日志对象
  const errorLog: ErrorLog = {
    type,
    message,
    timestamp: Date.now(),
    severity,
    componentName,
    details
  };

  // 添加到日志数组
  errorLogs.push(errorLog);
  
  // 如果超过最大数量，移除最旧的日志
  if (errorLogs.length > MAX_LOGS) {
    errorLogs.shift();
  }

  // 在控制台输出错误信息
  console.error(`[${type}][${severity}] ${message}`, details || '');
  
  // 这里可以添加将错误发送到服务器的逻辑
  // sendErrorToServer(errorLog);
};

/**
 * 获取所有错误日志
 * @returns 错误日志数组
 */
export const getErrorLogs = (): ErrorLog[] => {
  return [...errorLogs];
};

/**
 * 清除所有错误日志
 */
export const clearErrorLogs = (): void => {
  errorLogs.length = 0;
};

/**
 * 获取特定类型的错误日志
 * @param type 错误类型
 * @returns 指定类型的错误日志数组
 */
export const getErrorsByType = (type: ErrorTypeValue): ErrorLog[] => {
  return errorLogs.filter(log => log.type === type);
};

/**
 * 获取特定组件的错误日志
 * @param componentName 组件名称
 * @returns 指定组件的错误日志数组
 */
export const getErrorsByComponent = (componentName: string): ErrorLog[] => {
  return errorLogs.filter(log => log.componentName === componentName);
};
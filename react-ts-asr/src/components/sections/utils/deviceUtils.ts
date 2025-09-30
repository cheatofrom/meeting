/**
 * 设备检测工具函数
 */

/**
 * 检测是否为移动设备
 * @returns {boolean} 是否为移动设备
 */
export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
};

/**
 * 检测是否为触摸设备
 * @returns {boolean} 是否为触摸设备
 */
export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * 获取设备类型
 * @returns {string} 设备类型：'mobile' | 'tablet' | 'desktop'
 */
export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const width = window.innerWidth;
  
  if (width <= 480) {
    return 'mobile';
  } else if (width <= 768) {
    return 'tablet';
  } else {
    return 'desktop';
  }
};
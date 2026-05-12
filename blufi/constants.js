// libs/blufi.js - 基于 ESP-IDF 头文件的准确实现

// ========== BLUFI 帧类型和子类型定义 ==========
// 基于 esp-idf/components/bt/blufi/include/blufi/blufi.h

// 位掩码和移位定义
export const BLUFI_TYPE_MASK = 0x03;
export const BLUFI_TYPE_SHIFT = 0;
export const BLUFI_SUBTYPE_MASK = 0xFC;
export const BLUFI_SUBTYPE_SHIFT = 0x02;

// 类型获取和构建宏
export const BLUFI_GET_TYPE = (type) => (type & BLUFI_TYPE_MASK);
export const BLUFI_GET_SUBTYPE = (type) => ((type) >> BLUFI_SUBTYPE_SHIFT);
export const BLUFI_BUILD_TYPE = (type, subtype) => ((subtype << BLUFI_SUBTYPE_SHIFT) | type);

// 帧类型
export const BLUFI_TYPE = {
    CTRL: 0x0, // 控制帧
    DATA: 0x1 // 数据帧
};

// 控制帧子类型
export const BLUFI_CTRL_SUBTYPE = {
    ACK: 0x00, // 确认
    SET_SEC_MODE: 0x01, // 设置安全模式
    SET_WIFI_OPMODE: 0x02, // 设置WiFi操作模式
    CONN_TO_AP: 0x03, // 连接到AP
    DISCONN_FROM_AP: 0x04, // 从AP断开
    GET_WIFI_STATUS: 0x05, // 获取WiFi状态
    DEAUTHENTICATE_STA: 0x06, // 取消认证STA
    GET_VERSION: 0x07, // 获取版本
    DISCONNECT_BLE: 0x08, // 断开BLE连接
    GET_WIFI_LIST: 0x09 // 获取WiFi列表
};

// 数据帧子类型
export const BLUFI_DATA_SUBTYPE = {
    NEG: 0x00, // 协商
    STA_BSSID: 0x01, // STA的BSSID
    STA_SSID: 0x02, // STA的SSID
    STA_PASSWD: 0x03, // STA的密码
    SOFTAP_SSID: 0x04, // SoftAP的SSID
    SOFTAP_PASSWD: 0x05, // SoftAP的密码
    SOFTAP_MAX_CONN_NUM: 0x06, // SoftAP最大连接数
    SOFTAP_AUTH_MODE: 0x07, // SoftAP认证模式
    SOFTAP_CHANNEL: 0x08, // SoftAP信道
    USERNAME: 0x09, // 用户名
    CA: 0x0a, // CA证书
    CLIENT_CERT: 0x0b, // 客户端证书
    SERVER_CERT: 0x0c, // 服务器证书
    CLIENT_PRIV_KEY: 0x0d, // 客户端私钥
    SERVER_PRIV_KEY: 0x0e, // 服务器私钥
    WIFI_REP: 0x0f, // WiFi报告
    REPLY_VERSION: 0x10, // 回复版本
    WIFI_LIST: 0x11, // WiFi列表
    ERROR_INFO: 0x12, // 错误信息
    CUSTOM_DATA: 0x13, // 自定义数据
    STA_MAX_CONN_RETRY: 0x14, // STA最大连接重试次数
    STA_CONN_END_REASON: 0x15, // STA连接结束原因
    STA_CONN_RSSI: 0x16 // STA连接RSSI
};

// 类型检查函数
export const BLUFI_TYPE_IS_CTRL = (type) => (BLUFI_GET_TYPE(type) === BLUFI_TYPE.CTRL);
export const BLUFI_TYPE_IS_DATA = (type) => (BLUFI_GET_TYPE(type) === BLUFI_TYPE.DATA);

// ========== BLUFI 服务UUID定义 ==========
export const BLUFI_SERVICE_UUID = '0000FFFF-0000-1000-8000-00805F9B34FB';
export const BLUFI_WRITE_UUID = '0000FF01-0000-1000-8000-00805F9B34FB';
export const BLUFI_NOTIFY_UUID = '0000FF02-0000-1000-8000-00805F9B34FB';

// ========== WiFi 认证模式 ==========
export const WIFI_AUTH_MODE = {
    OPEN: 0x00,
    WEP: 0x01,
    WPA_PSK: 0x02,
    WPA2_PSK: 0x03,
    WPA_WPA2_PSK: 0x04,
    WPA2_ENTERPRISE: 0x05,
    WPA3_PSK: 0x06,
    WPA2_WPA3_PSK: 0x07
};

// ========== 操作模式 ==========
export const WIFI_OP_MODE = {
    NULL: 0x00,
    STA: 0x01,
    SOFTAP: 0x02,
    SOFTAP_STA: 0x03
};

// ========== 连接状态 ==========
export const WIFI_STATUS = {
    STA_CONN_SUCCESS: 0x00,
    STA_CONN_FAIL: 0x01,
    STA_CONN_CONNECTING: 0x02,
    STA_CONN_NO_IP: 0x03
};

// ========== 断开原因 ==========
export const WIFI_REASON = {
    WIFI_REASON_4WAY_HANDSHAKE_TIMEOUT: 15,
    WIFI_REASON_NO_AP_FOUND: 201,
    WIFI_REASON_HANDSHAKE_TIMEOUT: 204,
    WIFI_REASON_CONNECTION_FAIL: 205
};

// ========== 安全模式 ==========
export const SECURITY_MODE = {
    NO_SECURITY: 0x00,
    CHECKSUM: 0x01,
    DATA_ENCRYPTION: 0x02
};

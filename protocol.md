# BLUFI 协议说明

本文基于当前项目里的实际实现整理，重点不是照搬官方文档，而是把这个仓库真实发出去的字节、对应的 `type/subtype`、常见负载格式和交互顺序讲清楚，方便你迁移到其他平台。

相关实现文件：

- `blufi/constants.js`
- `blufi/blufi.js`
- `pages/device/device.js`

## 1. BLE 通道约定

当前项目固定使用如下 UUID：

- Service: `0000FFFF-0000-1000-8000-00805F9B34FB`
- Write Characteristic: `0000FF01-0000-1000-8000-00805F9B34FB`
- Notify Characteristic: `0000FF02-0000-1000-8000-00805F9B34FB`

移植到其他平台时，本质流程不变：

1. 连接 BLE 设备
2. 找到 Service
3. 找到写特征值和通知特征值
4. 打开 Notify
5. 按 BLUFI 包格式写入数据
6. 在 Notify 回调里解析设备返回的数据

## 2. 当前项目实际发送包格式

`blufi.js` 中 `buildPacket()` 生成的数据格式如下：

```text
[Byte0][Byte1][Byte2][Byte3][Payload...]
```

各字节含义：

- `Byte0`: `type + subtype` 组合字节
- `Byte1`: `frameCtrl`，当前项目发送时固定写死为 `0x00`
- `Byte2`: `sequence`，序列号，`0~255` 循环递增
- `Byte3`: `dataLength`，负载长度
- `Payload`: 负载内容

也就是：

```text
packet = [typeSubtype, 0x00, sequence, payload.length, ...payload]
```

注意两点：

- 当前项目发送侧没有真正启用加密，也没有主动附加校验字节。
- 页面里有“加密通讯”入口，但实际提示为“暂不支持加密模式通讯”，因此跨平台先按明文模式打通最稳。

## 3. `Byte0` 的编码方式

项目中 `Byte0` 的构造方式为：

```text
Byte0 = (subtype << 2) | type
```

其中：

- `type` 只占低 2 位
- `subtype` 左移 2 位后放入高 6 位

### 3.1 type 定义

| type | 含义 |
| --- | --- |
| `0x00` | 控制帧 `CTRL` |
| `0x01` | 数据帧 `DATA` |

### 3.2 反解规则

收到设备返回的第 1 个字节后，可按下面逻辑解析：

```text
type = byte0 & 0x03
subtype = byte0 >> 2
```

## 4. 控制帧 subtype 与首字节对应关系

控制帧 `type = 0x00`，因此首字节为：

```text
byte0 = (subtype << 2) | 0x00
```

| 控制命令 | subtype | Byte0 |
| --- | --- | --- |
| `ACK` | `0x00` | `0x00` |
| `SET_SEC_MODE` | `0x01` | `0x04` |
| `SET_WIFI_OPMODE` | `0x02` | `0x08` |
| `CONN_TO_AP` | `0x03` | `0x0C` |
| `DISCONN_FROM_AP` | `0x04` | `0x10` |
| `GET_WIFI_STATUS` | `0x05` | `0x14` |
| `DEAUTHENTICATE_STA` | `0x06` | `0x18` |
| `GET_VERSION` | `0x07` | `0x1C` |
| `DISCONNECT_BLE` | `0x08` | `0x20` |
| `GET_WIFI_LIST` | `0x09` | `0x24` |

## 5. 数据帧 subtype 与首字节对应关系

数据帧 `type = 0x01`，因此首字节为：

```text
byte0 = (subtype << 2) | 0x01
```

| 数据命令/上报 | subtype | Byte0 |
| --- | --- | --- |
| `NEG` | `0x00` | `0x01` |
| `STA_BSSID` | `0x01` | `0x05` |
| `STA_SSID` | `0x02` | `0x09` |
| `STA_PASSWD` | `0x03` | `0x0D` |
| `SOFTAP_SSID` | `0x04` | `0x11` |
| `SOFTAP_PASSWD` | `0x05` | `0x15` |
| `SOFTAP_MAX_CONN_NUM` | `0x06` | `0x19` |
| `SOFTAP_AUTH_MODE` | `0x07` | `0x1D` |
| `SOFTAP_CHANNEL` | `0x08` | `0x21` |
| `USERNAME` | `0x09` | `0x25` |
| `CA` | `0x0A` | `0x29` |
| `CLIENT_CERT` | `0x0B` | `0x2D` |
| `SERVER_CERT` | `0x0C` | `0x31` |
| `CLIENT_PRIV_KEY` | `0x0D` | `0x35` |
| `SERVER_PRIV_KEY` | `0x0E` | `0x39` |
| `WIFI_REP` | `0x0F` | `0x3D` |
| `REPLY_VERSION` | `0x10` | `0x41` |
| `WIFI_LIST` | `0x11` | `0x45` |
| `ERROR_INFO` | `0x12` | `0x49` |
| `CUSTOM_DATA` | `0x13` | `0x4D` |
| `STA_MAX_CONN_RETRY` | `0x14` | `0x51` |
| `STA_CONN_END_REASON` | `0x15` | `0x55` |
| `STA_CONN_RSSI` | `0x16` | `0x59` |

## 6. 当前项目实际发送的命令字节

下面的例子都基于当前仓库的 `buildPacket()` 真实逻辑。

### 6.1 协商请求 `NEG`

方法：

```js
getBlufiBuildPacketGetNegotitionData()
```

负载固定为：

```text
[0x00, 0x01, 0x07, 0x01]
```

含义分别是：

- `0x00`: 协商负载里的 frame control
- `0x01`: 版本
- `0x07`: 安全模式标记
- `0x01`: 校验类型

如果当前序列号是 `0x00`，完整字节如下：

```text
01 00 00 04 00 01 07 01
```

说明：

- `01`: `DATA + NEG`
- `00`: 外层包头 `frameCtrl`
- `00`: 序列号
- `04`: 负载长度
- `00 01 07 01`: 协商负载

注意：当前页面流程里并没有实际发送这个协商包，且项目也没有真正开启加密通讯，所以移植时可以把它视为“可选逻辑”。

### 6.2 设置 WiFi 工作模式为 `STA`

方法：

```js
getBlufiBuildPacketSetOpModeSTA()
```

负载：

```text
01
```

其中：

- `0x01` 表示 `WIFI_OP_MODE.STA`

假设当前序列号是 `0x00`，完整字节：

```text
08 00 00 01 01
```

解释：

- `08`: `CTRL + SET_WIFI_OPMODE`
- `00`: 外层 `frameCtrl`
- `00`: 序列号
- `01`: 负载长度
- `01`: `STA`

### 6.3 设置 SSID

方法：

```js
getBlufiBuildPacketSetSSID(ssid)
```

这一步把 SSID 按字节直接放进负载，当前实现是逐字符 `charCodeAt`，对纯 ASCII 字符串最直接。

例如 SSID 为 `TestWiFi`：

```text
SSID 字节: 54 65 73 74 57 69 46 69
```

假设当前序列号是 `0x01`，完整字节：

```text
09 00 01 08 54 65 73 74 57 69 46 69
```

解释：

- `09`: `DATA + STA_SSID`
- `00`: 外层 `frameCtrl`
- `01`: 序列号
- `08`: SSID 长度
- 后面 8 个字节就是 SSID 内容

### 6.4 设置密码

方法：

```js
getBlufiBuildPacketSetPassword(password)
```

例如密码为 `12345678`，假设当前序列号是 `0x02`：

```text
0D 00 02 08 31 32 33 34 35 36 37 38
```

解释：

- `0D`: `DATA + STA_PASSWD`
- `00`: 外层 `frameCtrl`
- `02`: 序列号
- `08`: 密码长度
- 后面是密码 ASCII 字节

### 6.5 发起连接路由器

方法：

```js
getBlufiBuildPacketSetConnectAP()
```

假设当前序列号是 `0x03`：

```text
0C 00 03 00
```

解释：

- `0C`: `CTRL + CONN_TO_AP`
- `00`: 外层 `frameCtrl`
- `03`: 序列号
- `00`: 无负载

### 6.6 查询当前 WiFi 状态

方法：

```js
getBlufiBuildPacketGetWiFiStatus()
```

例如序列号为 `0x04`：

```text
14 00 04 00
```

### 6.7 查询版本

方法：

```js
getBlufiBuildPacketGetVersion()
```

例如序列号为 `0x05`：

```text
1C 00 05 00
```

### 6.8 扫描周围 WiFi 列表

方法：

```js
getBlufiBuildPacketGetScanWiFiList()
```

例如序列号为 `0x06`：

```text
24 00 06 00
```

### 6.9 发送自定义数据

方法：

```js
getBlufiBuildPacketGetCustomData(data)
```

例如发送字符串 `hello`，其字节为：

```text
68 65 6C 6C 6F
```

假设当前序列号是 `0x07`，完整字节：

```text
4D 00 07 05 68 65 6C 6C 6F
```

## 7. 页面里实际采用的配网发送顺序

`pages/device/device.js` 中，确认配网时发送顺序如下：

1. `SET_WIFI_OPMODE(STA)`
2. `STA_SSID`
3. `STA_PASSWD`
4. `CONN_TO_AP`

也就是：

```text
08 ...
09 ...
0D ...
0C ...
```

如果你在其他平台复刻这个项目，优先按这个顺序发即可。

## 8. 设备返回数据如何区分 type/subtype

设备 Notify 上来的数据，项目中仍然是看第 1 个字节来识别：

```text
type = byte0 & 0x03
subtype = byte0 >> 2
```

因此无论在哪个平台，你的解析入口都建议先做下面两步：

1. 取 `byte0`
2. 先拆出 `type` 和 `subtype`
3. 再根据 `type/subtype` 进入对应分支解析负载

当前项目主要处理这些返回类型：

| type | subtype | 含义 |
| --- | --- | --- |
| `DATA` | `NEG` | 协商响应 |
| `DATA` | `WIFI_LIST` | WiFi 列表 |
| `DATA` | `WIFI_REP` | WiFi 状态报告 |
| `DATA` | `REPLY_VERSION` | 版本响应 |
| `DATA` | `ERROR_INFO` | 错误信息 |
| `DATA` | `STA_CONN_RSSI` | 连接 RSSI |
| `CTRL` | `ACK` 等 | 控制命令确认 |

## 9. 主要响应负载格式

这里同样不是完整官方协议，而是当前仓库已经落地处理过的几种响应。

### 9.1 版本响应 `REPLY_VERSION`

当前项目按下面格式解析：

```text
[major][minor]
```

例如：

```text
01 00
```

表示版本 `1.0`。

### 9.2 错误响应 `ERROR_INFO`

当前项目按下面格式解析：

```text
[errorCode]
```

常见错误码映射：

| 错误码 | 含义 |
| --- | --- |
| `0x00` | 成功 |
| `0x01` | 协商失败 |
| `0x02` | 校验失败 |
| `0x03` | 解密失败 |
| `0x04` | 数据包格式错误 |
| `0x05` | 不支持的安全模式 |
| `0x06` | 序列号错误 |
| `0x07` | 数据长度错误 |
| `0x08` | 操作失败 |
| `0x09` | 内存不足 |
| `0x0A` | 参数错误 |
| `0x0B` | WiFi 连接失败 |
| `0x0C` | WiFi 断开失败 |
| `0x0D` | 获取 WiFi 列表失败 |
| `0x0E` | 获取 WiFi 状态失败 |
| `0x0F` | 未知错误 |

### 9.3 WiFi 列表响应 `WIFI_LIST`

项目里按“多条记录拼接”的方式解析，每条记录格式为：

```text
[len][rssi][ssidBytes...]
```

其中：

- `len` 是当前记录总长度，不含自己这个长度字节
- `rssi` 为 1 字节有符号值，代码里用 `byte - 256` 转成负数
- 后面的字节为 SSID

例如某条记录可能像这样：

```text
09 D8 54 65 73 74 57 69 46
```

可理解为：

- `09`: 本条记录后续长度为 9
- `D8`: RSSI，转成十进制约为 `-40`
- 后续字节是 SSID 内容

### 9.4 WiFi 状态响应 `WIFI_REP`

项目里先取前 3 个字节：

```text
[opMode][staConnStatus][softapConnNum]
```

后面的内容，再按 TLV 解析：

```text
[type][length][data...]
```

当前代码已经识别的 TLV 类型主要是：

| TLV type | 含义 |
| --- | --- |
| `0x15` | `STA_CONN_END_REASON` |
| `0x16` | `STA_CONN_RSSI` |

也就是说，收到 `WIFI_REP` 后，你至少可以先这样解析：

1. 取第 1 字节作为 WiFi 工作模式
2. 取第 2 字节作为 STA 连接状态
3. 取第 3 字节作为 SoftAP 连接数
4. 剩余字节按 `TLV(type, len, data)` 循环读取

项目中用到的工作模式值：

| 值 | 含义 |
| --- | --- |
| `0x00` | `NULL` |
| `0x01` | `STA` |
| `0x02` | `SOFTAP` |
| `0x03` | `SOFTAP_STA` |

项目中用到的 STA 状态值：

| 值 | 含义 |
| --- | --- |
| `0x00` | 已连接成功 |
| `0x01` | 连接失败 |
| `0x02` | 连接中 |
| `0x03` | 已连上但还没有 IP |

## 10. 当前实现对 Notify 包头的额外处理

`handleNotification()` 里对设备返回包做了额外处理，逻辑来自 `isDataEnd()`：

- 它读取通知包的第 2 个字节作为“帧控制位图”
- 如果某个位表示带校验，则会裁掉尾部 2 字节
- 如果判断为未分包，则直接去掉前 4 字节头部
- 如果判断为分包，则去掉前 6 字节并等待后续包拼接

这说明当前接收侧默认认为设备返回包可能比发送包多出一些控制信息，尤其是分包时会多 2 字节。

但这里要特别注意：

- 当前仓库对返回包头位定义只有代码经验，没有完整注释。
- 如果你要做 Android、iOS、Web Bluetooth 或其他 BLE 平台版本，建议先按本文的发送格式实现。
- 对接收侧分包、校验、加密位的完整处理，最好再对照一份 ESP-BLUFI 官方定义做最终确认。

## 11. 建议的跨平台实现方式

如果你要在其他平台复刻，建议按下面的最小实现来做：

### 11.1 先做一个通用打包函数

```js
function buildPacket(type, subtype, payload, sequence) {
  const data = payload || [];
  const byte0 = (subtype << 2) | type;
  return new Uint8Array([
    byte0,
    0x00,
    sequence & 0xff,
    data.length & 0xff,
    ...data
  ]);
}
```

### 11.2 再封装业务命令

- 设置 STA 模式: `buildPacket(0x00, 0x02, [0x01], seq)`
- 设置 SSID: `buildPacket(0x01, 0x02, ssidBytes, seq)`
- 设置密码: `buildPacket(0x01, 0x03, passwdBytes, seq)`
- 连接 AP: `buildPacket(0x00, 0x03, [], seq)`
- 查询版本: `buildPacket(0x00, 0x07, [], seq)`
- 查询 WiFi 列表: `buildPacket(0x00, 0x09, [], seq)`
- 查询 WiFi 状态: `buildPacket(0x00, 0x05, [], seq)`

### 11.3 收包先按三步走

1. 取 `byte0`
2. 解出 `type` 和 `subtype`
3. 根据 `subtype` 解析负载

## 12. 迁移时最值得注意的几个坑

### 12.1 当前项目发送侧和接收侧对包头字段理解不完全一致

发送时使用的是：

```text
[typeSubtype][frameCtrl][sequence][length][payload]
```

但 `parsePacket()` 里却写成了：

```text
sequence = data[1]
length = data[3]
```

也就是它把 `data[1]` 当成了序列号，而发送侧实际把 `data[1]` 写成了 `frameCtrl`。

因此你在其他平台实现时，建议自己统一成一套明确规则，不要原样照抄这个小差异。

### 12.2 协商逻辑存在，但页面并未真正走完整安全协商链路

- `blufi.js` 里有 `NEG` 协商包构造
- 页面上也有“加密通讯”入口
- 但页面实际提示“不支持加密模式通讯”

所以现阶段最靠谱的移植目标，是先把“明文配网流程”完整跑通。

### 12.3 SSID/密码编码最好统一用 UTF-8

当前 `getBlufiBuildPacketSetSSID()` / `getBlufiBuildPacketSetPassword()` 使用的是逐字符 `charCodeAt()`。

这对英文和数字网络名通常没问题，但如果你后续要兼容中文 SSID，建议跨平台实现时统一改成 UTF-8 编码。

## 13. 一句话总结

如果只看这个仓库实际能跑通的核心逻辑，可以把它理解为：

1. 第 1 字节 `Byte0` 决定这是哪个 `type/subtype`
2. 后面跟一个固定 `0x00` 的控制字节
3. 再跟序列号和负载长度
4. 再放具体数据
5. 配网时按 `STA 模式 -> SSID -> 密码 -> 连接 AP` 顺序发送

这样你就可以很快在其他平台先复刻出一版可用的 BLUFI 明文配网流程。

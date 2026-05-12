
<p align="center">
  <!-- <a href="http://doc.mini.7yue.pro/"> -->
    <img
      class="QR-img" src="images/gh_57026554c41a_344.jpg">
  <!-- </a> -->
</p>

<div align="center"> <span class="logo" > BlufiEsp32WeChat 物联集市 </span> </div>

<div class="row" />
<div align="center">
  <span class="desc" >让微信小程序也可以配网设备</span> 
</div>



## 维护日志，版本修订；

| 修改时间   | 更新日志                                         |
| ---------- | ------------------------------------------------ |
| 2019.5.17  | 初次拟稿，完成配网，暂不开放                     |
| 2019.11.30 | 首次开源                                         |
| 2019.12.4  | 去除全局配置文件，增加对外使用文档               |
| 2022.12.20 | 增加MTU设置                                      |
| 2022.12.29 | 修改为获取模组周围SSID                           |
| 2026.05.02 | 全新的设计架构，解耦任何第三方平台，纯JS编程打造 |

## 一、效果体验

<img src="images\phone\ea83f4ab487021660f7f1552e8023ba2.png" alt="BlufiEsp32WeChat_SDK_3.1"  />

- ## 架构设计

  - 项目不依赖第三方框架，代码简洁易维护，纯JS编程打造。
  - 提供适配国内2大小程序平台，uni-app和微信小程序原生开发。

<img src="images\BlufiEsp32WeChat_SDK_02.png" alt="BlufiEsp32WeChat_SDK_3.1" style="zoom:48%;" />

## 二、🚀 使用步骤

1.  **导入项目**
    *   打开 **微信开发者工具**。
    *   选择“导入项目”，目录指向本项目根目录。
    *   AppID 可使用测试号或自己的 AppID。

2.  **真机调试**
    *   由于电脑端模拟器的蓝牙功能受限，**必须使用真机**进行测试。
    *   点击开发者工具的“真机调试”或“预览”，扫描二维码在手机上运行。

3.  **蓝牙搜索**
    *   确保手机蓝牙已打开，并授权微信小程序使用蓝牙权限。
    *   点击“搜索蓝牙设备”开始扫描。
    *   在输入框输入设备名称关键字（如 "Test"）可快速筛选目标设备。

4.  **设备通讯**
    *   点击设备列表中的“连接”按钮。
    *   进入详情页后，程序会自动连接并配置服务。
    *   **状态检查**：顶部状态栏显示“已连接”，且“读/写通道”均显示“就绪”时即可开始通讯。
    *   **发送数据**：点击下方按钮。
    *   **查看日志**：中间区域会实时滚动显示收发的数据包。

## 三、⚙️ 关键配置 (UUID)

在 `miniprogram/pages/device/device.js` 文件头部，可以修改目标设备的 UUID 配置：

```javascript
// 定义固定UUID常量
const TARGET_SERVICE_UUID = '55535343-FE7D-4AE5-8FA9-9FAFD205E455';         // 目标服务 UUID (模糊匹配)
const CHAR_UUID_WRITE = '49535343-8841-43F4-A8D4-ECBE34729BB3';             // 写特征值 UUID
const CHAR_UUID_READ_NOTIFY = '49535343-1E4D-4BD9-BA61-23C647249616';       // 读/通知特征值 UUID
```

*注：代码使用 `includes` 进行匹配，因此支持 16 位或 128 位 UUID。*

## 四、 🧩  接口文档

`this.blufi` 是在 `pages/device/device.js` 中通过 `new BlufiProtocol()` 创建的协议实例，源码位于 `blufi/blufi.js`。它本身不直接操作微信蓝牙 API，而是负责两类工作：

*   **构建 BLUFI 协议包**：把“查询版本、扫描 WiFi、设置 SSID/密码、连接 AP、自定义数据”等操作编码成 `ArrayBuffer`。
*   **解析 Notify 上报数据**：把模组返回的版本、WiFi 列表、WiFi 状态、协商结果、错误信息解析后，通过回调抛给页面。

### 1. 创建实例

```javascript
const BlufiProtocol = require('../../blufi/blufi.js');
this.blufi = new BlufiProtocol();
```

### 2. 典型接入方式

```javascript
this.blufi = new BlufiProtocol();

this.blufi.setCallback('onVersionReceived', this.callBackVersionReceived);
this.blufi.setCallback('onWifiListReceived', this.callBackWifiListReceived);
this.blufi.setCallback('onWifiStatusChanged', this.callBackWifiStatusChanged);
this.blufi.setCallback('onNegotiationComplete', this.callBackNegotiationComplete);

wx.onBLECharacteristicValueChange((res) => {
  this.blufi.handleNotification(res.value);
});
```

页面侧发送数据时，通常流程如下：

1. 调用 `this.blufi` 的发包方法生成 `ArrayBuffer`
2. 通过 `wx.writeBLECharacteristicValue` 把数据写到写特征值
3. 设备通过 Notify 返回结果
4. 页面把 `res.value` 交给 `this.blufi.handleNotification()`
5. `this.blufi` 解析完成后触发已注册回调

### 3. 回调接口

下表是当前实现中实际可用于页面接收模组数据解析到的结果的回调：

| 回调名 | 参数 | 说明 |
| --- | --- | --- |
| `onVersionReceived` | `version: string` | 收到模组 BLUFI 版本，例如 `1.0` |
| `onWifiListReceived` | `list: Array<{ ssid: string, rssi: number }>` | 收到扫描到的热点列表 |
| `onWifiStatusChanged` | `status: object` | 收到模组当前 WiFi 状态 |
| `onNegotiationComplete` | `success: boolean` | 收到协商完成结果，当前实现返回 `true` |
| `onError` | `message: string, error: any` | 协议解析或设备错误时触发 |
| `onLog` | `message: string, data: any` | 协议内部日志回调，便于调试 |

注册方式统一为：

```javascript
this.blufi.setCallback('onWifiListReceived', (list) => {
  console.log(list);
});
```

`onWifiStatusChanged` 当前返回的数据结构如下：

```javascript
{
  opMode: Number,
  staConnStatus: Number,
  softapConnNum: Number,
  staBssid: String,
  staSsid: String,
  staIp: String
}
```

### 4. 发包接口

以下方法由页面直接调用，用来生成要写入 BLE 特征值的 `ArrayBuffer`：

| 方法名 | 参数 | 返回值 | 用途 |
| --- | --- | --- | --- |
| `getBlufiBuildPacketGetNegotitionData()` | 无 | `ArrayBuffer` | 构建协商请求包 |
| `getBlufiBuildPacketGetWiFiStatus()` | 无 | `ArrayBuffer` | 查询当前 WiFi 状态 |
| `getBlufiBuildPacketSetSSID(ssid)` | `ssid: string` | `ArrayBuffer` | 设置 STA 模式下的 SSID |
| `getBlufiBuildPacketSetPassword(password)` | `password: string` | `ArrayBuffer` | 设置 STA 模式下的密码 |
| `getBlufiBuildPacketSetConnectAP()` | 无 | `ArrayBuffer` | 触发连接路由器 |
| `getBlufiBuildPacketSetOpModeSTA()` | 无 | `ArrayBuffer` | 设置 WiFi 工作模式为 `STA` |
| `getBlufiBuildPacketGetVersion()` | 无 | `ArrayBuffer` | 查询模组版本 |
| `getBlufiBuildPacketGetScanWiFiList()` | 无 | `ArrayBuffer` | 查询周边 WiFi 列表 |
| `getBlufiBuildPacketGetCustomData(data)` | `data: Uint8Array` | `ArrayBuffer` | 发送自定义业务数据 |
| `getBlufiBuildPacketSetWifiOpMode(opMode)` | `opMode: number` | `Promise<ArrayBuffer>` | 按指定模式构建 WiFi 工作模式包 |

说明：

*   除 `getBlufiBuildPacketSetWifiOpMode(opMode)` 外，其余方法都同步返回 `ArrayBuffer`。
*   `getBlufiBuildPacketGetCustomData(data)` 要求传入 `Uint8Array`，页面通常先把字符串转成字节数组后再调用。
*   当前页面中的配网流程，实际发送顺序为：`STA 模式 -> SSID -> Password -> Connect AP`。

### 5. 状态与通知处理接口

这些接口通常由页面在连接生命周期中调用：

| 方法名 | 参数 | 说明 |
| --- | --- | --- |
| `setCallback(type, callback)` | `string, Function` | 注册协议层回调 |
| `onBlufiConnectionStateChange(isConnected)` | `boolean` | 通知协议层蓝牙连接状态，断开时会重置序列号和缓存 |
| `handleNotification(arrayBuffer)` | `ArrayBuffer` | 解析 Notify 上报数据，并分发到对应回调 |
| `resetState()` | 无 | 手动清空协议状态 |

推荐在 BLE 断开时调用：

```javascript
if (this.blufi) {
  this.blufi.onBlufiConnectionStateChange(false);
}
```

推荐在 Notify 回调中调用：

```javascript
wx.onBLECharacteristicValueChange((res) => {
  this.blufi.handleNotification(res.value);
});
```

### 6. 常见调用示例

#### 查询版本

```javascript
const buffer = this.blufi.getBlufiBuildPacketGetVersion();
this._sendBuffer(buffer);
```

#### 扫描周边 WiFi

```javascript
const buffer = this.blufi.getBlufiBuildPacketGetScanWiFiList();
this._sendBuffer(buffer);
```

#### 发送配网信息

```javascript
const bufferSta = this.blufi.getBlufiBuildPacketSetOpModeSTA();
this._sendBuffer(bufferSta);

const bufferSSID = this.blufi.getBlufiBuildPacketSetSSID(ssid);
this._sendBuffer(bufferSSID);

const bufferPWD = this.blufi.getBlufiBuildPacketSetPassword(password);
this._sendBuffer(bufferPWD);

const bufferConnectAP = this.blufi.getBlufiBuildPacketSetConnectAP();
this._sendBuffer(bufferConnectAP);
```

#### 发送自定义数据

```javascript
const bytes = this.stringToUint8Array('hello');
const buffer = this.blufi.getBlufiBuildPacketGetCustomData(bytes);
this._sendBuffer(buffer);
```

### 7. 使用约束

*   `this.blufi` 只负责协议打包和解析，不负责自动发送数据。
*   页面必须自行维护 `deviceId`、`serviceId`、写特征值 UUID、Notify 特征值 UUID。
*   页面必须在 BLE Notify 数据到达时手动调用 `handleNotification()`，否则不会触发任何回调。
*   断开连接后建议销毁实例或至少调用 `onBlufiConnectionStateChange(false)`，避免序列号和缓存残留。
*   当前源码中声明了 `onConnected`、`onDisconnected` 等回调字段，但现有实现没有主动触发它们，页面若需要可后续补充。

## 📂 目录结构

```。ntext
miniprogram/
├── pages/
│   ├── index/          # 首页：蓝牙搜索与列表过滤
│   │   ├── index.js    # 搜索逻辑
│   │   ├── index.wxml  # 搜索界面
│   │   └── index.wxss  # 样式文件
│   └── device/         # 详情页：连接与通讯
│       ├── device.js   # 通讯核心逻辑 (连接/读写/解析)
│       ├── device.wxml # 通讯界面 (日志/按钮/输入框)
│       └── device.wxss # 样式文件
├── app.js              # 全局逻辑
└── app.json            # 全局配置
```

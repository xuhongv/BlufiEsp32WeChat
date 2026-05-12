// 使用 require 导入
const BlufiProtocol = require('../../blufi/blufi.js');

// ========== BLUFI 服务UUID定义 ==========
const TARGET_SERVICE_UUID = '0000FFFF-0000-1000-8000-00805F9B34FB';
const CHAR_UUID_WRITE = '0000FF01-0000-1000-8000-00805F9B34FB';
const CHAR_UUID_READ_NOTIFY = '0000FF02-0000-1000-8000-00805F9B34FB';


Page({
    // blufi
    blufi: null,
    data: {
        deviceId: '',
        name: '',
        connected: false,
        // 状态标志
        serviceFound: false,
        writeReady: false,
        notifyReady: false,

        inputText: '',
        isHex: false,

        logs: [],
        scrollTop: 0,
        // 配网弹窗
        showNetConfigModal: false,
        ssid: '',
        password: '',
        wifiList: [],
        selectedWifiIndex: 0,
        passwordVisible: false,
    },

    onLoad(options) {
        const deviceId = options.deviceId
        const name = decodeURIComponent(options.name || '')
        this.setData({
            deviceId,
            name
        })
        // 创建连接
        this.createBLEConnection(deviceId)

        // 获取BLUFI实例
        this.getBlufiInstance();
    },

    onUnload() {
        this.closeBLEConnection()
    },

    startEncrypt() {
        wx.showToast({
            title: '暂不支持加密模式通讯',
            icon: 'error',
            duration: 2500
        })
    },

    /**
     * 0. 获取BLUFI实例
     */
    getBlufiInstance() {
        // 实例化对象
        this.blufi = new BlufiProtocol();
        // blufi 版本查询回调函数
        this.blufi.setCallback('onVersionReceived', this.callBackVersionReceived);
        // 查询模组周围热点列表回调函数
        this.blufi.setCallback('onWifiListReceived', this.callBackWifiListReceived);
        // WiFi 状态改变或查询回调函数
        this.blufi.setCallback('onWifiStatusChanged', this.callBackWifiStatusChanged);
        // 序列号协商回调函数
        this.blufi.setCallback('onNegotiationComplete', this.callBackNegotiationComplete);
    },


    connectBlueTooth() {
        this.createBLEConnection(this.data.deviceId)
    },

    // 1. 连接设备
    createBLEConnection(deviceId) {
        this.addLog(`开始连接: ${deviceId}`, 'info')
        wx.createBLEConnection({
            deviceId,
            success: () => {
                // 更新MTU
                wx.setBLEMTU({
                    deviceId: deviceId,
                    mtu: 240,
                })
                this.addLog('连接成功，正在初始化服务...', 'info')
                this.getBLEDeviceServices(deviceId)
            },
            fail: (res) => {
                this.addLog(`连接失败: ${res.errMsg}`, 'info')
                wx.showToast({
                    title: '连接失败',
                    icon: 'none'
                })
            }
        })
        // 监听连接状态
        wx.onBLEConnectionStateChange((res) => {
            this.setData({
                connected: res.connected
            })
            if (!res.connected) {
                // 通知数据包修改状态
                if(this.blufi){
                    this.blufi.onBlufiConnectionStateChange(res.connected)
                }
                this.blufi = null
                this.addLog('连接已断开', 'info')
                this.setData({
                    serviceFound: false,
                    writeReady: false,
                    notifyReady: false
                })
                wx.showToast({
                    title: '连接已断开',
                    icon: 'error'
                })
            }
        })
    },

    closeBLEConnection() {
        wx.closeBLEConnection({
            deviceId: this.data.deviceId
        })
        this.setData({
            connected: false
        })
    },

    // 2. 获取服务
    getBLEDeviceServices(deviceId) {
        wx.getBLEDeviceServices({
            deviceId,
            success: (res) => {
                // 寻找目标服务
                const targetService = res.services.find(s => s.uuid.toUpperCase().includes(TARGET_SERVICE_UUID))
                if (targetService) {
                    this.setData({
                        serviceFound: true
                    })
                    this.addLog(`找到目标服务: ${TARGET_SERVICE_UUID}`, 'info')
                    this.getBLEDeviceCharacteristics(deviceId, targetService.uuid)
                } else {
                    this.addLog(`未找到目标服务 ${TARGET_SERVICE_UUID}`, 'info')
                    wx.showToast({
                        title: '未找到目标服务',
                        icon: 'none'
                    })
                }
            },
            fail: (res) => {
                this.addLog(`获取服务失败: ${res.errMsg}`, 'info')
            }
        })
    },

    // 3. 获取特征值
    getBLEDeviceCharacteristics(deviceId, serviceId) {
        this._serviceId = serviceId // 保存实际的 Service UUID (可能是长 UUID)
        wx.getBLEDeviceCharacteristics({
            deviceId,
            serviceId,
            success: (res) => {
                // 寻找写特征值 
                const writeChar = res.characteristics.find(c => c.uuid.toUpperCase().includes(CHAR_UUID_WRITE))
                if (writeChar) {
                    this._writeCharId = writeChar.uuid
                    this.setData({
                        writeReady: true
                    })
                    this.addLog(`写通道就绪: ${CHAR_UUID_WRITE}`, 'info')
                }

                // 寻找读/通知特征值
                const notifyChar = res.characteristics.find(c => c.uuid.toUpperCase().includes(CHAR_UUID_READ_NOTIFY))
                if (notifyChar) {
                    this._notifyCharId = notifyChar.uuid
                    this.setData({
                        notifyReady: true
                    })
                    // 自动开启通知
                    this.notifyBLECharacteristicValueChange(true)
                }

                if (!writeChar && !notifyChar) {
                    this.addLog('未找到指定的特征值 ' + CHAR_UUID_READ_NOTIFY, 'info')
                    wx.showToast({
                        title: '特征值不匹配',
                        icon: 'none'
                    })
                }
            },
            fail: (res) => {
                this.addLog(`获取特征值失败: ${res.errMsg}`, 'info')
            }
        })
    },


    // 4. 开启/关闭通知 (使用固定特征值)
    notifyBLECharacteristicValueChange(enable) {
        if (!this._notifyCharId) return
        wx.notifyBLECharacteristicValueChange({
            state: enable,
            deviceId: this.data.deviceId,
            serviceId: this._serviceId,
            characteristicId: this._notifyCharId,
            success: (res) => {
                this.addLog(`通知已${enable ? '开启' : '关闭'}`, 'info')
                if (enable) {
                    this.initValueChangeListener()
                    this.setData({
                        connected: true
                    })
                    wx.showToast({
                        title: '已连接',
                    })
                }
            },
            fail: (res) => {
                this.addLog(`Notify操作失败: ${res.errMsg}`, 'info')
            }
        })
    },

    initValueChangeListener() {
        // 避免重复监听
        if (this._isListening) return
        this._isListening = true
        wx.onBLECharacteristicValueChange((res) => {
            // 过滤特征值，只处理
            if (res.characteristicId.toUpperCase().includes(CHAR_UUID_READ_NOTIFY)) {
                this.blufi.handleNotification(res.value);
            }
        })
    },

    // 7. 点击配网
    sendCommandNetConfig() {
        this.setData({
            showNetConfigModal: true
        })
        console.log(this.data.showNetConfigModal)
    },

    onSsidInput(e) {
        this.setData({ ssid: e.detail.value });
    },

    onPasswordInput(e) {
        this.setData({ password: e.detail.value });
    },

    onCancelNetConfig() {
        this.setData({ showNetConfigModal: false, ssid: '', password: '' });
    },

    onRefreshWifiList() {
        this.sendCommandScanWiFiList();
    },

    onWifiPickerChange(e) {
        const selectedIndex = e.detail.value;
        this.setData({
            selectedWifiIndex: selectedIndex,
            ssid: this.data.wifiList[selectedIndex].ssid,
        });
    },

    togglePasswordVisibility() {
        this.setData({
            passwordVisible: !this.data.passwordVisible,
        });
    },

    onConfirmNetConfig() {
        const { wifiList, selectedWifiIndex, password } = this.data;
        const ssid = wifiList[selectedWifiIndex] ? wifiList[selectedWifiIndex].ssid : '';

        if (!ssid) {
            wx.showToast({
                title: 'SSID不能为空',
                icon: 'none'
            });
            return;
        }

        const bufferSta = this.blufi.getBlufiBuildPacketSetOpModeSTA();
        this._sendBuffer(bufferSta, `发送配网信息，设置STATION模式`);

        const bufferSSID = this.blufi.getBlufiBuildPacketSetSSID(ssid);
        this._sendBuffer(bufferSSID, `发送配网信息: SSID=${ssid}`);

        const bufferPWD = this.blufi.getBlufiBuildPacketSetPassword(password);
        this._sendBuffer(bufferPWD, `发送配网信息: Password=${password}`);

        const bufferConnectAP = this.blufi.getBlufiBuildPacketSetConnectAP();
        this._sendBuffer(bufferConnectAP, `发送配网信息`);

        //this.setData({ showNetConfigModal: false, ssid: '', password: '' });
    },
    // 获取状态
    sendCommandGetStatus(e) { 
        if (!this.data.connected || !this._writeCharId) {
            wx.showToast({
                title: '写通道未就绪',
                icon: 'none'
            })
            return
        }
        const buffer = this.blufi.getBlufiBuildPacketGetWiFiStatus();
        this._sendBuffer(buffer, `设置数据: ${this.ab2hex(buffer)}`)
    },

    // 获取版本号
    sendCommandGetVersion() {
        if (!this.data.connected || !this._writeCharId) {
            wx.showToast({
                title: '写通道未就绪',
                icon: 'none'
            })
            return
        }
        const buffer = this.blufi.getBlufiBuildPacketGetVersion();
        this._sendBuffer(buffer, `设置数据: ${this.ab2hex(buffer)}`)
    },

    // 获取周围WiFi列表
    sendCommandScanWiFiList() {
        if (!this.data.connected || !this._writeCharId) {
            wx.showToast({
                title: '写通道未就绪',
                icon: 'none'
            })
            return
        }
        wx.showLoading({
            title: '获取WiFi列表中...',
        })
        const buffer = this.blufi.getBlufiBuildPacketGetScanWiFiList();
        this._sendBuffer(buffer, `设置数据: ${this.ab2hex(buffer)}`)
    },

    // 发送自定义数据
    sendCommandCustomData() {
        if (!this.data.connected || !this._writeCharId) {
            wx.showToast({
                title: '写通道未就绪',
                icon: 'none'
            })
            return
        }
        wx.showModal({
            title: '发送自定义数据',
            editable: true,
            placeholderText: '请输入要发送的文本',
            success: (res) => {
                if (res.confirm && res.content) {
                    const data = res.content;
                    const buffer = this.blufi.getBlufiBuildPacketGetCustomData(this.stringToUint8Array(data));
                    this._sendBuffer(buffer, `设置数据: ${this.ab2hex(buffer)}`)
                }
            }
        })
    },

    // 统一发送 Buffer
    _sendBuffer(buffer, logMsg) {
        wx.writeBLECharacteristicValue({
            deviceId: this.data.deviceId,
            serviceId: this._serviceId,
            characteristicId: this._writeCharId,
            value: buffer,
            success: (res) => { },
            fail: (res) => {
                this.addLog(`发送失败: ${res.errMsg}`, 'info')
                wx.showToast({
                    title: '发送失败',
                    icon: 'none'
                })
            }
        })
    },

    // blufi 回调版本查询
    callBackVersionReceived(verison) {
        this.addLog(`接收到模组Blufi库版本: ${verison}`, 'send')
    },

    // 查询模组周围热点列表回调函数
    callBackWifiListReceived(list) {

        wx.hideLoading();

        this.addLog(`接收到WiFi列表: ${JSON.stringify(list)}`, 'send');
        const wifiList = list.map(item => ({
            ...item,
            ssidRssi: `${item.ssid}`
        }));
        this.setData({
            wifiList: wifiList,
        });
    },

    // WiFi 状态改变或查询回调函数
    callBackWifiStatusChanged(data) {
        this.addLog(`状态改变或查询回调: ${data}`, 'send')
        console.log(data)
    },
    // 序列号协商回调函数
    callBackNegotiationComplete(data) {
        this.addLog(`序列号协商回调: ${data}`, 'send')
    },

    // 工具函数
    addLog(content, type) {
        const time = new Date().toTimeString().substring(0, 8)
        const log = {
            time,
            content,
            type
        }
        const logs = this.data.logs
        logs.push(log)
        this.setData({
            logs,
            scrollTop: logs.length * 100
        })
    },

    clearLog() {
        this.setData({
            logs: []
        })
    },

    // ArrayBuffer转16进制字符串
    ab2hex(buffer) {
        let hexArr = Array.prototype.map.call(
            new Uint8Array(buffer),
            function (bit) {
                return ('00' + bit.toString(16)).slice(-2)
            }
        )
        return hexArr.join(' ').toUpperCase()
    },

    // 16进制字符串转ArrayBuffer
    hexStringToArrayBuffer(str) {
        if (!str) return new ArrayBuffer(0)
        var buffer = new ArrayBuffer(str.length / 2)
        let dataView = new DataView(buffer)
        let ind = 0
        for (var i = 0, len = str.length; i < len; i += 2) {
            let code = parseInt(str.substr(i, 2), 16)
            dataView.setUint8(ind, code)
            ind++
        }
        return buffer
    },

    // 字符串转ArrayBuffer
    stringToBuffer(str) {
        let val = str
        let length = val.length
        let buffer = new ArrayBuffer(length)
        let uint8 = new Uint8Array(buffer)
        for (let i = 0; i < length; i++) {
            uint8[i] = val.charCodeAt(i)
        }
        return buffer
    },

    stringToUint8Array(str) {
        // 优先使用 TextEncoder
        if (typeof TextEncoder !== 'undefined') {
            const encoder = new TextEncoder();
            return encoder.encode(str);
        }

        // 降级方案
        const bytes = [];

        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);

            if (code < 0x80) {
                bytes.push(code);
            } else if (code < 0x800) {
                bytes.push(0xC0 | (code >> 6));
                bytes.push(0x80 | (code & 0x3F));
            } else if (code < 0xD800 || code >= 0xE000) {
                bytes.push(0xE0 | (code >> 12));
                bytes.push(0x80 | ((code >> 6) & 0x3F));
                bytes.push(0x80 | (code & 0x3F));
            } else {
                i++;
                const code2 = str.charCodeAt(i);
                const fullCode = 0x10000 + (((code & 0x3FF) << 10) | (code2 & 0x3FF));

                bytes.push(0xF0 | (fullCode >> 18));
                bytes.push(0x80 | ((fullCode >> 12) & 0x3F));
                bytes.push(0x80 | ((fullCode >> 6) & 0x3F));
                bytes.push(0x80 | (fullCode & 0x3F));
            }
        }

        return new Uint8Array(bytes);
    },
    // HEX转字符串
    hexCharCodeToStr(hexCharCodeStr) {
        var arr = Array.prototype.map.call(new Uint8Array(hexCharCodeStr), x => x)
        var str = ''
        for (var i = 0; i < arr.length; i++) {
            str += String.fromCharCode(arr[i])
        }
        return str
    }
})
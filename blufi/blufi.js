const Constants = require('./constants.js');
const utils = require('./utils.js');

class BlufiProtocol {

    constructor() {
        // 设备连接信息
        this.deviceId = null;
        this.serviceId = null;
        this.writeCharId = null;
        this.notifyCharId = null;

        // 协议状态
        this.sequence = 0;
        this.isConnected = false;
        this.isNegotiated = false;
        this.debugMode = false;

        // 是否分包
        this.flagEnd = false;
        this.bleData = [];

        // 回调函数
        this.callbacks = {

            onConnected: null,
            onDisconnected: null,
            onWifiListReceived: null,
            onWifiStatusChanged: null,
            onError: null,
            onLog: null,
            onNegotiationComplete: null,
            onVersionReceived: null
        };
    }

    /**
     * 设置回调函数
     */
    setCallback(type, callback) {
        if (this.callbacks.hasOwnProperty(type)) {
            this.callbacks[type] = callback;
        }
    }

    /**
     * 重置状态
     */
    resetState() {
        this.sequence = 0;
        this.isConnected = false;
        this.isNegotiated = false;
        this.buffer = [];
    }


    /**
     * 
     * @param {*} isConnected 蓝牙连接状态
     */
    onBlufiConnectionStateChange(isConnected) {
        this.isConnected = isConnected;
        if (isConnected) {} else {
            this.resetState()
        }
    }

    // ========== 核心数据包构建方法 ==========

    /**
     * 构建 BLUFI 数据包（基于 ESP-IDF 定义）
     * 格式: [type+subtype][sequence][length][data...]
     */
    buildPacket(frameType, subtype, data) {
        const sequence = this.getNextSequence();
        const dataLength = data ? data.length : 0;

        // 使用 Constants.BLUFI_BUILD_TYPE 宏构建类型+子类型字节
        const typeSubtypeByte = Constants.BLUFI_BUILD_TYPE(frameType, subtype);

        // 数据包结构
        const packet = new Uint8Array(4 + dataLength);

        packet[0] = typeSubtypeByte; // 类型+子类型
        packet[1] = 0; // 控制帧
        packet[2] = sequence; // 序列号
        packet[3] = dataLength; // 数据长度

        if (data && dataLength > 0) {
            packet.set(data, 4); // 数据内容
        }

        // 调试信息
        // const typeStr = Constants.BLUFI_TYPE_IS_CTRL(typeSubtypeByte) ? '控制帧' : '数据帧';
        // const subtypeValue = Constants.BLUFI_GET_SUBTYPE(typeSubtypeByte);

        // this.log('构建完整数据:', Array.from(packet));
        // this.log(`构建数据包: ${typeStr}, 子类型=0x${subtypeValue.toString(16)}, 序列=${sequence}, 长度=${dataLength}`);

        if (this.debugMode && dataLength > 0) {
            this.log('数据内容:', Array.from(data));
        }

        return packet;
    }

    /**
     * 解析接收到的数据包
     */
    parsePacket(data) {
        if (data.length < 3) {
            throw new Error('数据包长度不足');
        }

        const typeSubtypeByte = data[0];
        const sequence = data[1];
        const length = data[3];
        const payload = data.slice(4, 4 + length);

        const frameType = Constants.BLUFI_GET_TYPE(typeSubtypeByte);
        const subtype = Constants.BLUFI_GET_SUBTYPE(typeSubtypeByte);

        return {
            frameType,
            subtype,
            sequence,
            length,
            payload,
            typeSubtypeByte,
            isCtrlFrame: Constants.BLUFI_TYPE_IS_CTRL(typeSubtypeByte),
            isDataFrame: Constants.BLUFI_TYPE_IS_DATA(typeSubtypeByte)
        };
    }

    // ========== BLUFI 命令方法 ==========

    /**
     * 发送协商请求（数据帧，子类型 NEG）
     */
    async sendNegotiation() {
        try {
            this.log('发送协商请求...');

            // 协商数据: [帧控制][版本][安全模式][校验类型]
            // 帧控制通常为0
            // 版本: 0x01 (BLUFI v1.0)
            // 安全模式: 0x01|0x02|0x04 = 0x07 (支持所有模式)
            // 校验类型: 0x01 (CRC)
            const negotiateData = new Uint8Array([
                0x00, // 帧控制
                0x01, // 版本
                0x07, // 安全模式
                0x01 // 校验类型
            ]);

            const packet = this.buildPacket(
                Constants.BLUFI_TYPE.DATA, // 数据帧
                Constants.BLUFI_DATA_SUBTYPE.NEG, // 协商子类型
                negotiateData
            );

            await this.sendPacket(packet);
            this.log('协商请求已发送');
            return true;

        } catch (error) {
            this.handleError('发送协商失败', error);
            return false;
        }
    }


    getBlufiBuildPacketGetNegotitionData() {
        // 协商数据: [帧控制][版本][安全模式][校验类型]
        // 帧控制通常为0
        // 版本: 0x01 (BLUFI v1.0)
        // 安全模式: 0x01|0x02|0x04 = 0x07 (支持所有模式)
        // 校验类型: 0x01 (CRC)
        const negotiateData = new Uint8Array([
            0x00, // 帧控制
            0x01, // 版本
            0x07, // 安全模式
            0x01 // 校验类型
        ]);

        const packet = this.buildPacket(
            Constants.BLUFI_TYPE.DATA, // 数据帧
            Constants.BLUFI_DATA_SUBTYPE.NEG, // 协商子类型
            negotiateData
        );

        return (new Uint8Array(packet)).buffer;
    }


    /**
     * 
     * @returns 
     */
    getBlufiBuildPacketGetWiFiStatus() {
        const packetStatus = this.buildPacket(
            Constants.BLUFI_TYPE.CTRL, // 控制帧
            Constants.BLUFI_CTRL_SUBTYPE.GET_WIFI_STATUS, // 获取WiFi状态
            null // 无数据
        );
        return (new Uint8Array(packetStatus)).buffer;
    }

    /**
     * 设置 SSID（数据帧，子类型 STA_SSID）
     */
    getBlufiBuildPacketSetSSID(ssid) {
        const ssidBytes = this.stringToBytes(ssid);
        const packetSSID = this.buildPacket(
            Constants.BLUFI_TYPE.DATA, // 数据帧
            Constants.BLUFI_DATA_SUBTYPE.STA_SSID,
            ssidBytes
        );
        return (new Uint8Array(packetSSID)).buffer;
    }

    /**
     * 设置密码（数据帧，子类型 STA_PASSWD）
     */
    getBlufiBuildPacketSetPassword(password) {
        const passwordBytes = this.stringToBytes(password);
        const packetPWD = this.buildPacket(
            Constants.BLUFI_TYPE.DATA, // 数据帧
            Constants.BLUFI_DATA_SUBTYPE.STA_PASSWD,
            passwordBytes
        );
        return (new Uint8Array(packetPWD)).buffer;
    }


    /**
     * 连接到 AP（数据帧，子类型 CONN_TO_AP）
     * @returns 
     */
    getBlufiBuildPacketSetConnectAP() {
        const packetStartConn = this.buildPacket(
            Constants.BLUFI_TYPE.CTRL, // 数据帧
            Constants.BLUFI_CTRL_SUBTYPE.CONN_TO_AP,
            null
        );
        return (new Uint8Array(packetStartConn)).buffer;
    }


    /**
     * 设置 STA 模式（控制帧，子类型 SET_WIFI_OPMODE）
     * @returns 
     */
    getBlufiBuildPacketSetOpModeSTA() {
        const opModeData = new Uint8Array([Constants.WIFI_OP_MODE.STA]);
        const packetSetStaMode = this.buildPacket(
            Constants.BLUFI_TYPE.CTRL, // 控制帧
            Constants.BLUFI_CTRL_SUBTYPE.SET_WIFI_OPMODE,
            opModeData
        );
        return (new Uint8Array(packetSetStaMode)).buffer;
    }


    /**
     * 获取版本信息（控制帧，子类型 GET_VERSION）
     */
    getBlufiBuildPacketGetVersion() {
        const packet = this.buildPacket(
            Constants.BLUFI_TYPE.CTRL, // 控制帧
            Constants.BLUFI_CTRL_SUBTYPE.GET_VERSION, // 获取版本
            null // 无数据
        );
        return (new Uint8Array(packet)).buffer;
    }

    /**
     * 获取 WiFi 列表信息（控制帧，子类型 GET_WIFI_LIST）
     */
    getBlufiBuildPacketGetScanWiFiList() {
        const packet = this.buildPacket(
            Constants.BLUFI_TYPE.CTRL, // 控制帧
            Constants.BLUFI_CTRL_SUBTYPE.GET_WIFI_LIST, // 获取WiFi列表
            null // 无数据
        );
        return (new Uint8Array(packet)).buffer;
    }

    /**
     * 发送自定义数据（数据帧，子类型 CUSTOM_DATA)
     */
    getBlufiBuildPacketGetCustomData(data) {
        const packet = this.buildPacket(
            Constants.BLUFI_TYPE.DATA, // 数据帧
            Constants.BLUFI_DATA_SUBTYPE.CUSTOM_DATA, // 发送自定义数据 
            data //数据
        );
        return (new Uint8Array(packet)).buffer;
    }


    /**
     * 设置 WiFi 操作模式（控制帧，子类型 SET_WIFI_OPMODE）
     */
    async getBlufiBuildPacketSetWifiOpMode(opMode) {
        this.log(`设置WiFi操作模式: ${opMode}`);
        const opModeData = new Uint8Array([opMode]);
        const packet = this.buildPacket(
            Constants.BLUFI_TYPE.CTRL, // 控制帧
            Constants.BLUFI_CTRL_SUBTYPE.SET_WIFI_OPMODE, // 设置WiFi操作模式
            opModeData
        );
        return (new Uint8Array(packet)).buffer;
    }

    // ========== 数据处理方法 ==========

    /**
     * 处理接收到的数据
     */
    handleNotification(arrayBuffer) {
        try {
            let list = (utils.ab2hex(arrayBuffer));
            let result = this.bleData;
            list = this.isDataEnd(utils.hexToBinArray(list[1]), list);
            //拼接一起
            result = this.bleData.concat(list);
            this.bleData = result;
            // 是否已经结束
            if (this.flagEnd) {
                this.flagEnd = false;
                const data = new Uint8Array(arrayBuffer);
                // 解析数据包
                const parsed = this.parsePacket(data);
                const {
                    frameType,
                    subtype,
                    sequence,
                    length,
                    payload,
                    isCtrlFrame,
                    isDataFrame
                } = parsed;
                this.log(`收到数据包: ${isCtrlFrame ? '控制帧' : '数据帧'}, 子类型=0x${subtype.toString(16)}, 序列=${sequence}, 长度=${length}`);
                // 根据帧类型处理
                if (isCtrlFrame) {
                    this.handleCtrlFrame(subtype, payload, sequence, result);
                } else if (isDataFrame) {
                    this.handleDataFrame(subtype, payload, sequence, result);
                } else {
                    this.log(`未知帧类型: ${frameType}`);
                }
            }
        } catch (error) {
            this.handleError('处理通知数据失败', error);
        }
    }

    /**
     * 处理控制帧
     */
    handleCtrlFrame(subtype, payload, sequence) {
        this.log(`处理控制帧响应: 子类型=0x${subtype.toString(16)}`);

        // 控制帧通常不需要处理payload，除非是错误响应
        switch (subtype) {
            case Constants.BLUFI_CTRL_SUBTYPE.ACK:
                this.log('收到ACK确认');
                break;

            case Constants.BLUFI_CTRL_SUBTYPE.GET_WIFI_LIST:
                // 注意: WiFi列表数据是通过数据帧返回的，不是控制帧
                this.log('WiFi列表请求已确认');
                break;

            case Constants.BLUFI_CTRL_SUBTYPE.GET_WIFI_STATUS:
                this.log('WiFi状态请求已确认');
                break;

            case Constants.BLUFI_CTRL_SUBTYPE.GET_VERSION:
                this.log('版本请求已确认');
                break;

            default:
                this.log(`未处理的控制帧子类型: 0x${subtype.toString(16)}`);
        }
    }

    /**
     * 处理数据帧
     */
    handleDataFrame(subtype, payload, sequence, completedata) {
        this.log(`处理数据帧: 子类型=0x${subtype.toString(16)}`);
        switch (subtype) {
            case Constants.BLUFI_DATA_SUBTYPE.NEG:
                this.handleNegotiationResponse(payload);
                break;

            case Constants.BLUFI_DATA_SUBTYPE.WIFI_LIST:
                this.handleWifiList(payload, completedata);
                break;

            case Constants.BLUFI_DATA_SUBTYPE.WIFI_REP:
                this.handleWifiReport(payload, completedata);
                break;

            case Constants.BLUFI_DATA_SUBTYPE.REPLY_VERSION:
                this.handleVersionResponse(payload);
                break;

            case Constants.BLUFI_DATA_SUBTYPE.ERROR_INFO:
                this.handleErrorInfo(payload);
                break;

            case Constants.BLUFI_DATA_SUBTYPE.STA_CONN_RSSI:
                this.handleConnectionRSSI(payload);
                break;

            default:
                this.log(`未处理的数据帧子类型: 0x${subtype.toString(16)}`);
                if (payload.length > 0) {
                    this.log('载荷数据:', Array.from(payload));
                }
        }
    }

    // ========== 响应处理方法 ==========

    /**
     * 处理协商响应
     */
    handleNegotiationResponse(payload) {
        try {

            if (payload.length >= 3) {
                const frameCtrl = payload[0];
                const version = payload[1];
                const securityMode = payload[2];

                this.log(`协商响应: 帧控制=${frameCtrl}, 版本=${version}, 安全模式=${securityMode}`);

                this.isNegotiated = true;

                if (this.callbacks.onNegotiationComplete) {
                    this.callbacks.onNegotiationComplete(true);
                }

                this.log('密钥协商完成');
            } else {
                this.log('协商响应数据不完整');
            }
        } catch (error) {
            this.handleError('处理协商响应失败', error);
        }
    }

    /**
     * 解析WiFi列表数据
     */
    parseWifiList(arr, totalLength) {
        let curLength = 0;
        let result = [];

        while (arr.length > 0 && curLength < totalLength) {
            // 读取当前记录的长度
            const len = parseInt(arr[0], 16);
            if (len <= 0) {
                arr.shift(); // 移除长度字段
                curLength += 1;
                continue;
            }

            // 检查是否有足够的数据
            if (arr.length < len + 1) {
                break; // 数据不完整，退出循环
            }

            // 计算当前记录的总长度
            curLength += (1 + len);
            if (curLength > totalLength) {
                break; // 超出总长度，退出循环
            }

            // 提取 RSSI（第一个字节）
            const rssi = parseInt(arr[1], 16) - 256;

            // 提取名称数据（从第二个字节开始）
            const nameData = arr.slice(2, len + 1).map(byte => parseInt(byte, 16));

            // 解码名称
            const ssid = decodeURIComponent(escape(String.fromCharCode(...nameData)))

            // 检查名称是否为空或无效
            if (!ssid || ssid.trim().length === 0) {
                // 名称为空，移除数据并跳过
                arr.splice(0, len + 1);
                continue;
            }

            // 记录有效结果
            result.push({
                ssid,
                rssi
            });

            // 移除已处理的数据
            arr.splice(0, len + 1);
        }

        return result;
    }
    /**
     * 处理WiFi列表
     */
    handleWifiList(payload, completedata) {
        try {
            this.log(`completedata 长度： ${completedata.length} `);
            const wifiList = this.parseWifiList(completedata, completedata.length)
            this.log(`解析到 ${wifiList.length} 个WiFi网络`);
            if (this.callbacks.onWifiListReceived) {
                this.callbacks.onWifiListReceived(wifiList);
            }
        } catch (error) {
            this.handleError('处理WiFi列表失败', error);
        }
    }


    //判断返回的数据是否加密
    isDataEnd(fragNum, list) {
        if (fragNum[7] == "1") { //返回数据加密
            if (fragNum[6] == "1") {
                var len = list.length - 2;
                list = list.slice(0, len);
            }
            if (fragNum[3] == "0") { //未分包
                list = list.slice(4);
                this.flagEnd = true
            } else { //分包
                list = list.slice(6);
            }
        } else { //返回数据未加密
            if (fragNum[6] == "1") {
                var len = list.length - 2;
                list = list.slice(0, len);
            }
            if (fragNum[3] == "0") { //未分包
                list = list.slice(4);
                this.flagEnd = true
            } else { //分包
                list = list.slice(6);
            }
        }
        return list;
    }

    /**
     * 处理WiFi状态报告
     */
    isReasonValid(reason) {
        return ((reason >= 0 && reason <= 24) || (reason == 53) || (reason >= 200 && reason <= 207));
    }

    isRssiValid(rssi) {
        /* define rssi -128 as N/A */
        return (rssi > -128 && rssi <= 127);
    }

    getWiFiStatusEndInfo(mConnectionEndReason, mConnectionRssi) {
        let msg = '';
        const mConnectionRssiLimit = -60;
        msg = ("Reason code: ") + (this.isReasonValid(mConnectionEndReason) ? mConnectionEndReason : "N/A") + (", ");
        msg = msg + ("Rssi: ") + (this.isRssiValid(mConnectionRssi) ? mConnectionRssi : "N/A") + ("\n");
        if (mConnectionEndReason == Constants.WIFI_REASON.WIFI_REASON_NO_AP_FOUND) {
            msg = msg + ("NO AP FOUND") + ("\n");
        } else if (mConnectionEndReason == Constants.WIFI_REASON.WIFI_REASON_CONNECTION_FAIL) {
            msg = msg + ("AP IN BLACKLIST, PLEASE RETRY") + ("\n");
        } else if (this.isRssiValid(mConnectionRssi)) {
            if (mConnectionRssi < mConnectionRssiLimit) {
                msg = msg + ("RSSI IS TOO LOW") + ("\n");
            } else if (mConnectionEndReason == Constants.WIFI_REASON.WIFI_REASON_4WAY_HANDSHAKE_TIMEOUT ||
                mConnectionEndReason == Constants.WIFI_REASON.WIFI_REASON_HANDSHAKE_TIMEOUT) {
                msg = msg + ("WRONG PASSWORD") + ("\n");
            }
        }

        return msg;
    }

    handleWifiReport(payload, completedata) {
        this.log('handleWifiReport:', utils.uint8ArrayToHexArray(payload));
        this.log('completedata:', utils.uint8ArrayToHexArray(completedata));
        try {
            let descReport = 'OpMode: ';
            if (payload.length >= 3) {
                const opMode = payload[0];
                const staConnStatus = payload[1];
                const softapConnNum = payload[2];
                let rssi = -1;
                let disConnectReason = -1;

                const handleAfterData = utils.parseTLVWithLoop(payload.slice(3))
                handleAfterData.forEach(({
                    type,
                    length,
                    data
                }) => {
                    //this.log(`循环拿到数值: Type=${type}`);
                    switch (type) {
                        case Constants.BLUFI_DATA_SUBTYPE.STA_CONN_END_REASON:
                            disConnectReason = data;
                            this.log(`WiFi状态报告: 断开连接错误码=${disConnectReason}`);
                            break;
                        case Constants.BLUFI_DATA_SUBTYPE.STA_CONN_RSSI:
                            rssi = data - 256;
                            this.log(`WiFi状态报告: Rssi=${rssi}`);
                            break;
                        default:
                            break;
                    }
                })

                switch (opMode) {
                    case Constants.WIFI_OP_MODE.NULL:
                        descReport = descReport + 'NULL';
                        break;
                    case Constants.WIFI_OP_MODE.STA:
                        descReport = descReport + 'station';
                        break;
                    case Constants.WIFI_OP_MODE.SOFTAP:
                        descReport = descReport + 'softap';
                        break;
                    case Constants.WIFI_OP_MODE.SOFTAP_STA:
                        descReport = descReport + 'station/softap';
                        break
                    default:
                        break;
                }
                descReport = descReport + '\r\n';

                switch (opMode) {
                    case Constants.WIFI_OP_MODE.STA:
                    case Constants.WIFI_OP_MODE.SOFTAP_STA:
                        if (staConnStatus == Constants.WIFI_STATUS.STA_CONN_SUCCESS) {
                            descReport = descReport + ("Station connect Wi-Fi now, got IP\n");
                        } else if (staConnStatus == Constants.WIFI_STATUS.STA_CONN_NO_IP) {
                            descReport = descReport + ("Station connect Wi-Fi now, no IP found\n");
                        } else if (staConnStatus == Constants.WIFI_STATUS.STA_CONN_FAIL) {
                            descReport = descReport + ("Station disconnect Wi-Fi now\n");
                            //补充具体的原因描述
                            descReport = descReport + (this.getWiFiStatusEndInfo(disConnectReason, rssi));
                        } else {
                            descReport = descReport + ("Station is connecting WiFi now\n");
                            // info.append(getConnectingInfo());
                        }
                        // if (mStaBSSID != null) {
                        //     descReport = descReport + ("Station connect Wi-Fi bssid: ").append(mStaBSSID).append('\n');
                        // }
                        // if (mStaSSID != null) {
                        //     descReport = descReport + ("Station connect Wi-Fi ssid: ").append(mStaSSID).append('\n');
                        // }
                        // if (mStaPassword != null) {
                        //     descReport = descReport + ("Station connect Wi-Fi password: ").append(mStaPassword).append('\n');
                        // }
                        break;
                }


                this.log(`WiFi状态解析报告:\n `, descReport);

                const status = {
                    opMode: opMode,
                    staConnStatus: staConnStatus,
                    softapConnNum: softapConnNum,
                    staBssid: '',
                    staSsid: '',
                    staIp: ''
                };

                let offset = 3;

                // 解析BSSID (6字节)
                if (offset + 6 <= payload.length) {
                    const bssidBytes = payload.slice(offset, offset + 6);
                    status.staBssid = Array.from(bssidBytes).map(b => b.toString(16).padStart(2, '0')).join(':');
                    offset += 6;
                }

                // 解析SSID
                if (offset < payload.length) {
                    const ssidLen = payload[offset++];
                    if (offset + ssidLen <= payload.length) {
                        const ssidBytes = payload.slice(offset, offset + ssidLen);
                        status.staSsid = this.bytesToString(ssidBytes);
                        offset += ssidLen;
                    }
                }

                // 解析IP地址 (4字节)
                if (offset + 4 <= payload.length) {
                    const ipBytes = payload.slice(offset, offset + 4);
                    status.staIp = Array.from(ipBytes).join('.');
                }

                this.log(`WiFi状态报告: 模式=${opMode}, 连接状态=${staConnStatus}, IP=${status.staIp}`);

                if (this.callbacks.onWifiStatusChanged) {
                    this.callbacks.onWifiStatusChanged(status);
                }
            }
        } catch (error) {
            this.handleError('处理WiFi报告失败', error);
        }
    }

    /**
     * 处理版本响应
     */
    handleVersionResponse(payload) {
        try {
            if (payload.length > 0) {
                const BTC_BLUFI_GREAT_VER = payload[0];
                const BTC_BLUFI_SUB_VER = payload[1];
                const version = BTC_BLUFI_GREAT_VER + '.' + BTC_BLUFI_SUB_VER;
                // this.log(`设备版本: ${version}`);
                if (this.callbacks.onVersionReceived) {
                    this.callbacks.onVersionReceived(version);
                }
            }
        } catch (error) {
            this.handleError('处理版本响应失败', error);
        }
    }

    /**
     * 处理错误信息
     */
    handleErrorInfo(payload) {
        try {
            if (payload.length > 0) {
                const errorCode = payload[0];
                const errorMsg = this.getErrorDescription(errorCode);
                this.log(`设备报告错误: 代码=0x${errorCode.toString(16)}, 描述=${errorMsg}`);

                if (this.callbacks.onError) {
                    this.callbacks.onError(`设备错误: ${errorMsg}`, {
                        code: errorCode
                    });
                }
            }
        } catch (error) {
            this.handleError('处理错误信息失败', error);
        }
    }

    /**
     * 处理连接RSSI
     */
    handleConnectionRSSI(payload) {
        try {
            if (payload.length > 0) {
                const rssi = payload[0] - 256; // 转换为负数
                this.log(`连接RSSI: ${rssi} dBm`);
            }
        } catch (error) {
            this.handleError('处理连接RSSI失败', error);
        }
    }

    // ========== 工具方法 ==========

    /**
     * 获取下一个序列号
     */
    getNextSequence() {
        const seq = this.sequence;
        this.sequence = (this.sequence + 1) % 256;
        return seq;
    }

    /**
     * 字符串转字节数组
     */
    stringToBytes(str) {
        const bytes = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
            bytes[i] = str.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * 字节数组转字符串
     */
    bytesToString(bytes) {
        return String.fromCharCode.apply(null, bytes);
    }

    /**
     * 获取认证模式名称
     */
    getAuthModeName(authMode) {
        const names = {
            [Constants.WIFI_AUTH_MODE.OPEN]: '开放',
            [Constants.WIFI_AUTH_MODE.WEP]: 'WEP',
            [Constants.WIFI_AUTH_MODE.WPA_PSK]: 'WPA',
            [Constants.WIFI_AUTH_MODE.WPA2_PSK]: 'WPA2',
            [Constants.WIFI_AUTH_MODE.WPA_WPA2_PSK]: 'WPA/WPA2',
            [Constants.WIFI_AUTH_MODE.WPA2_ENTERPRISE]: '企业版',
            [Constants.WIFI_AUTH_MODE.WPA3_PSK]: 'WPA3',
            [Constants.WIFI_AUTH_MODE.WPA2_WPA3_PSK]: 'WPA2/WPA3'
        };

        return names[authMode] || `未知(0x${authMode.toString(16)})`;
    }

    /**
     * 获取信号强度描述
     */
    getSignalStrength(rssi) {
        if (rssi > -50) return '极强';
        if (rssi > -60) return '强';
        if (rssi > -70) return '中等';
        if (rssi > -80) return '弱';
        return '极弱';
    }

    /**
     * 获取错误描述
     */
    getErrorDescription(errorCode) {
        const errors = {
            0x00: '成功',
            0x01: '协商失败',
            0x02: '校验失败',
            0x03: '解密失败',
            0x04: '数据包格式错误',
            0x05: '不支持的安全模式',
            0x06: '序列号错误',
            0x07: '数据长度错误',
            0x08: '操作失败',
            0x09: '内存不足',
            0x0A: '参数错误',
            0x0B: 'WiFi连接失败',
            0x0C: 'WiFi断开失败',
            0x0D: '获取WiFi列表失败',
            0x0E: '获取WiFi状态失败',
            0x0F: '未知错误'
        };

        return errors[errorCode] || `未知错误(0x${errorCode.toString(16)})`;
    }

    /**
     * 记录日志
     */
    log(message, data = null) {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${message}`;
        console.log(logMessage, data || '');
        if (this.callbacks.onLog) {
            this.callbacks.onLog(message, data);
        }
    }

    /**
     * 错误处理
     */
    handleError(message, error) {
        const errorMsg = `${message}: ${error.message || error}`;
        this.log(`错误: ${errorMsg}`);

        if (this.callbacks.onError) {
            this.callbacks.onError(errorMsg, error);
        }
    }

    /**
     * 休眠函数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 导出类
module.exports = BlufiProtocol;
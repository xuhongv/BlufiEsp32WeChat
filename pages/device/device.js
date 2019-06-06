const app = getApp()
Page({
  data: {
    inputText: 'Hello World!',
    receiveText: '',
    name: '',
    connectedDeviceId: '',
    services: {},
    characteristics: {},
    connected: true,
    bleSendSequence: 0
  },
  bindInput: function(e) {
    this.setData({
      inputText: e.detail.value
    })
    console.log(e.detail.value)
  },
  Send: function() {
    var that = this
    if (that.data.connected) {
      that.sendSSID();
      that.sendPASSWORD();
      that.notifyConnect();
    } else {
      wx.showModal({
        title: '提示',
        content: '蓝牙已断开',
        showCancel: false,
        success: function(res) {
          that.setData({
            searching: false
          })
        }
      })
    }
  },
  onLoad: function(options) {
    var that = this
    console.log(options)
    that.setData({
      name: options.name,
      connectedDeviceId: options.connectedDeviceId
    })
    wx.getBLEDeviceServices({
      deviceId: that.data.connectedDeviceId,
      success: function(res) {
        console.log("getBLEDeviceServices success :" + JSON.stringify(res.services))
        that.setData({
          services: res.services
        })
        wx.getBLEDeviceCharacteristics({
          deviceId: options.connectedDeviceId,
          serviceId: res.services[0].uuid,
          success: function(res) {
            console.log('getBLEDeviceCharacteristics success :' + JSON.stringify(res.characteristics))
            that.setData({
              characteristics: res.characteristics
            })
            wx.notifyBLECharacteristicValueChange({
              state: true,
              deviceId: options.connectedDeviceId,
              serviceId: that.data.services[0].uuid,
              characteristicId: that.data.characteristics[1].uuid,
              success: function(res) {
                console.log('启用notify成功')
              }
            })
          }
        })
      }
    })
    wx.onBLEConnectionStateChange(function(res) {
      console.log(res.connected)
      that.setData({
        connected: res.connected
      })
    })
    wx.onBLECharacteristicValueChange(function(res) {
    
      // console.log('接收到数据类型：' + typeof res.value)
      // console.log('接收到数据 res.value：' + JSON.stringify(res.value))
      let arrayBuffer = new ArrayBuffer(15);
      let array = Array.prototype.slice.call(new Uint8Array(res.value));

      let type = array[0] & 0xff;
      //console.log('接收到数据类型 arry[0]=' + array[0]+",type=" + type)
      // let pkgType = array[0] & 0x3;
      // let subType = ((array[0] & 0xfc) >> 2);
      // console.log('接收到数据类型 pkgType：' + pkgType)
      // console.log('接收到数据类型 subType' + subType)

      for (var i = 2; i < array.length; i++) {
        //console.log('接收到数据：' + i + ":" + array[i] + ":" + array[i].toString(16))
      }

      // var receiveText = that.ab2str(res.value)
      // console.log('接收到数据 receiveText' + receiveText)


    })
  },
  onReady: function() {

  },
  onShow: function() {

  },
  onHide: function() {

  },
  notifyConnect: function() {
    let password = 'oo'
    let u8buffer = new Uint8Array(password.length)
    for (var i = 0; i < password.length; i++) {
      u8buffer[i] = password.charCodeAt(i)
    }
    this.bleSendCMD(app.globalData.controllEnum.PACKAGE_VALUE,
      app.globalData.controllEnum.SUBTYPE_CONNECT_WIFI,
      0,
      u8buffer);
  },
  sendSSID: function() {
    let password = 'app_haier'
    let u8buffer = new Uint8Array(password.length)
    for (var i = 0; i < password.length; i++) {
      u8buffer[i] = password.charCodeAt(i)
    }
    this.bleSendCMD(app.globalData.dataEnum.PACKAGE_VALUE,
      app.globalData.dataEnum.SUBTYPE_STA_WIFI_SSID,
      0,
      u8buffer);
  },
  sendPASSWORD: function() {
    let password = 'xlinyun@123456'
    let u8buffer = new Uint8Array(password.length)
    for (var i = 0; i < password.length; i++) {
      u8buffer[i] = password.charCodeAt(i)
    }
    this.bleSendCMD(app.globalData.dataEnum.PACKAGE_VALUE,
      app.globalData.dataEnum.SUBTYPE_STA_WIFI_PASSWORD,
      0,
      u8buffer);
  },
  ab2hex: function(buffer) {
    var hexArr = Array.prototype.map.call(
      new Uint8Array(buffer),
      function(bit) {
        return ('00' + bit.toString(16)).slice(-2)
      }
    )
    return hexArr.join('');
  },
  ab2str: function(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
  },
  strhex2ab: function(str) {
    var out = new ArrayBuffer(str.length / 2);
    var u8a = new Uint8Array(out);
    for (var i = 0; i < str.length / 2; i++) {
      u8a[i] = parseInt(str.substr(2 * i, 2), 16);
      //console.log("hex:" + u8a[i])
    }
    return out;
  }, //ESP32的蓝牙配网命令接口
  bleSendCMD: function(CMD, subCMD, frameControl, payload) {

    var ab = new ArrayBuffer(payload.length + 6)
    var u8array = new Uint8Array(ab);
    var LSB_Type = ((subCMD & 0x3f) << 2) | (CMD & 0x03);

    u8array[0] = LSB_Type;
    u8array[1] = frameControl;
    u8array[2] = this.data.bleSendSequence;
    u8array[3] = payload.length;
    for (let i = 0; i < payload.length; i++) {
      u8array[4 + i] = payload[i];
    }

    this.data.bleSendSequence++;
    var that = this


    if (that.data.connected) {
      wx.writeBLECharacteristicValue({
        deviceId: that.data.connectedDeviceId,
        serviceId: that.data.services[0].uuid,
        characteristicId: that.data.characteristics[0].uuid,
        value: ab,
      })
    }
  },

})
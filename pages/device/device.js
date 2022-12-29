var xBlufi = require("../../utils/blufi/xBlufi.js");
Page({
  data: {
    version: '2.2',
    name: '',
    index: 0,
    array: [],
    connectedDeviceId: '',
    connected: true,
    deviceInfo: null,
    isInitOK: false,
    password: '',
    customData: '',
  },
  onShow: function (options) {
    this.initWifi()
  },
  onLoad: function (options) {
    var that = this
    this.initWifi()
    that.setData({
      name: options.name,
      connectedDeviceId: options.deviceId,
      name: options.name
    })
    xBlufi.listenDeviceMsgEvent(true, this.funListenDeviceMsgEvent);
    xBlufi.notifyInitBleEsp32({
      deviceId: options.deviceId,
    })
    wx.showLoading({
      title: '设备初始化中',
    })
  },
  onUnload: function () {
    console.log("unload ")
    let that = this
    xBlufi.notifyConnectBle({
      isStart: false,
      deviceId: that.data.connectedDeviceId,
      name: that.data.name,
    });
    xBlufi.listenDeviceMsgEvent(false, this.funListenDeviceMsgEvent);
  },
  funListenDeviceMsgEvent: function (options) {
    let that = this
    let ssid_arry = this.data.array;
    switch (options.type) {
      case xBlufi.XBLUFI_TYPE.TYPE_STATUS_CONNECTED:
        that.setData({
          connected: options.result
        });
        if (!options.result) {
          wx.showModal({
            title: '很抱歉提醒你！',
            content: '小程序与设备异常断开',
            showCancel: false, //是否显示取消按钮
            success: function (res) {
              wx.navigateBack({
                url: '../search/search'
              })
            },
          })
        }
        break;
      case xBlufi.XBLUFI_TYPE.TYPE_CONNECT_ROUTER_RESULT:
        wx.hideLoading();
        if (!options.result)
          wx.showModal({
            title: '温馨提示',
            content: '配网失败，请重试',
            showCancel: false, //是否显示取消按钮
          })
        else {

          if (options.data.progress == 100) {
            let ssid = options.data.ssid;
            wx.showModal({
              title: '温馨提示',
              content: `连接成功路由器【${options.data.ssid}】`,
              showCancel: false, //是否显示取消按钮
              success: function (res) {
                wx.setStorage({
                  key: ssid,
                  data: that.data.password
                })
                //判断是否为空
                if (that.data.customData)
                  //开始发送自定义数据，此方法可以在蓝牙连接esp设备之后，随时随地调用！
                  xBlufi.notifySendCustomData({
                    customData: that.data.customData,
                  })
              },
            })
          }
        }
        break;
      case xBlufi.XBLUFI_TYPE.TYPE_RECIEVE_CUSTON_DATA:
        console.log("收到设备发来的自定义数据结果：", (options.data))
        wx.showModal({
          title: '收到自定义设备数据',
          content: `【${options.data}】`,
          showCancel: false, //是否显示取消按钮
        })
        break;
      case xBlufi.XBLUFI_TYPE.TYPE_CONNECT_NEAR_ROUTER_LISTS:
        //console.log(options.data)
        wx.hideLoading();
        if ('' === options.data.SSID)
          break;
        ssid_arry.push(options.data.SSID)
        that.setData({
          array: ssid_arry
        })
        console.log(that.data.array)
        break;
      case xBlufi.XBLUFI_TYPE.TYPE_INIT_ESP32_RESULT:
        wx.hideLoading();
        console.log("初始化结果：", JSON.stringify(options))
        if (options.result) {
          console.log('初始化成功')
          xBlufi.notifySendGetNearRouterSsid()
          wx.showLoading({
            title: '模组获取周围WiFi列表...',
          })
        } else {
          console.log('初始化失败')
          that.setData({
            connected: false
          })
          wx.showModal({
            title: '温馨提示',
            content: `设备初始化失败`,
            showCancel: false, //是否显示取消按钮
            success: function (res) {
              wx.redirectTo({
                url: '../search/search'
              })
            }
          })
        }
        break;
    }
  },
  OnClickStart: function () {
    if (!this.data.ssid) {
      wx.showToast({
        title: 'SSID不能为空',
        icon: 'none'
      })
      return
    }
    if (!this.data.password) {
      wx.showToast({
        title: '密码不能为空',
        icon: 'none'
      })
      return;
    }

    wx.showLoading({
      title: '正在配网',
      mask: true
    })
    xBlufi.notifySendRouterSsidAndPassword({
      ssid: this.data.ssid,
      password: this.data.password
    })
  },
  bindPasswordInput: function (e) {
    this.setData({
      password: e.detail.value
    })
  },
  bindCustomDataInput: function (e) {
    this.setData({
      customData: e.detail.value
    })
  },
  initWifi() {

  },
  bindPickerChange: function (e) {


    console.log('picker发送选择改变，携带值为', e.detail.value)
  
    this.setData({
      index: e.detail.value
    })    
    
    
    console.log("ssid=>", this.data.array[e.detail.value])

    let password = wx.getStorageSync(this.data.array[e.detail.value])

    console.log("password=>", password)

    this.setData({
      ssid: this.data.array[e.detail.value],
      isInitOK: true,
      password: password == undefined ? "" : password
    })


  },

})
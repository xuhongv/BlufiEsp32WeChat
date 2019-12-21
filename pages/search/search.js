const app = getApp()
var xBlufi = require("../../utils/blufi/xBlufi.js");
let _this = null;

Page({
  data: {
    devicesList: [],
    searching: false,
  },
  onLoad: function() {
    _this = this;
    xBlufi.initXBlufi(1);
    console.log("xBlufi", xBlufi.XMQTT_SYSTEM)
    xBlufi.listenDeviceMsgEvent(true, this.funListenDeviceMsgEvent);
  },
  funListenDeviceMsgEvent: function(options) {

    switch (options.type) {

     
      case xBlufi.XBLUFI_TYPE.TYPE_GET_DEVICE_LISTS:
        if (options.result)
          _this.setData({
            devicesList: options.data
          });
        break;

      case xBlufi.XBLUFI_TYPE.TYPE_CONNECTED:
        console.log("连接回调：" + JSON.stringify(options))
        if (options.result) {
          wx.hideLoading()
          wx.showToast({
            title: '连接成功',
            icon: 'none'
          })
          wx.navigateTo({
            url: '../device/device?deviceId=' + options.data.deviceId + '&name=' + options.data.name,
          });

        } else {
          // wx.hideLoading()
          // wx.showModal({
          //   title: '提示',
          //   content: '连接失败',
          //   showCancel: false
          // });
        }
        break;

      case xBlufi.XBLUFI_TYPE.TYPE_GET_DEVICE_LISTS_START:
        if (!options.result) {
          console.log("蓝牙未开启 fail =》", options)
          wx.showToast({
            title: '蓝牙未开启',
            icon: 'none'
          })
        } else {
          //蓝牙搜索开始
          _this.setData({
            searching: true
          });
        }
        break;

      case xBlufi.XBLUFI_TYPE.TYPE_GET_DEVICE_LISTS_STOP:
        if (options.result) {
          //蓝牙停止搜索ok
          console.log('蓝牙停止搜索ok')
        } else {
          //蓝牙停止搜索失败
          console.log('蓝牙停止搜索失败')
        }
        _this.setData({
          searching: false
        });
        break;

    }
  },
  Search: function() {
    if (this.data.searching) {
      xBlufi.notifyStartDiscoverBle({
        'isStart': false
      })
    } else {
      xBlufi.notifyStartDiscoverBle({
        'isStart': true
      })
    }
  },
  Connect: function(e) {
    //停止搜索
    xBlufi.notifyStartDiscoverBle({
      'isStart': false
    })
    for (var i = 0; i < _this.data.devicesList.length; i++) {
      if (e.currentTarget.id === _this.data.devicesList[i].deviceId) {
        let name = _this.data.devicesList[i].name
        console.log('点击了，蓝牙准备连接的deviceId:' + e.currentTarget.id)
        xBlufi.notifyConnectBle({
          isStart: true,
          deviceId: e.currentTarget.id,
          name
        });
        wx.showLoading({
          title: '连接蓝牙设备中...',
        })
      }
    }
  },
  onUnload: function() {
    xBlufi.listenDeviceMsgEvent(false, this.funListenDeviceMsgEvent);
  }
});
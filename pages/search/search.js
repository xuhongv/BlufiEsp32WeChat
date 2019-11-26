//获取应用实例
const app = getApp();
const util = require('../../utils/blufi/util.js');

Page({
  data: {
    deviceList: [],
    deviceId: "",
  },
  bindViewConnect: function(event) {
    console.log("click:" + JSON.stringify(event))
    var self = this;
    let deviceId = event.currentTarget.dataset.value;
    self.setData({
      deviceId: deviceId
    });
    wx.stopBluetoothDevicesDiscovery();
    wx.navigateTo({
      url: '/pages/routerInput/routerInput?deviceId=' + deviceId,
    })
  },
  openBluetooth: function() {
    const self = this;
    wx.closeBluetoothAdapter({
      success: function() {}
    });
    wx.openBluetoothAdapter({
      success: function(res) {
        wx.startBluetoothDevicesDiscovery({
          success: function(res) {
            self.getBluDevice();
          }
        })
      },
      fail: function(res) {
        wx.showToast({
          title: '请打开蓝牙',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },
  getBluDevice: function() {
    var self = this;
    wx.getBluetoothDevices({
      success: function(res) {
        console.log(res);
        var list = util.filterDevice(res.devices, "name");
        if (list.length > 0) {
          wx.stopPullDownRefresh();
          wx.hideLoading();
        }
        self.setData({
          deviceList: list
        })
      }
    })
    wx.onBluetoothDeviceFound(function(res) {
      console.log(res.devices[0].name);
      var list = util.filterDevice(res.devices, "name");
      if (list.length > 0) {
        wx.stopPullDownRefresh();
        wx.hideLoading();
      }
      self.setData({
        deviceList: self.data.deviceList.concat(list)
      })
    })
  },
  onLoad: function() {
    var self = this;
    wx.setNavigationBarTitle({
      title: '设备扫描'
    });
    wx.showLoading({
      title: '设备扫描中...',
    })
    self.openBluetooth();
  },
  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {
    var self = this,
      deviceId = self.data.deviceId;
    if (!util._isEmpty(deviceId)) {
      wx.closeBLEConnection({
        deviceId: deviceId,
      })
    }
  },
  onPullDownRefresh: function() {
    this.setData({
      deviceList: []
    })
    this.openBluetooth();
  },
})
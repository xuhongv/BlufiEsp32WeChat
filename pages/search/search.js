const app = getApp()
let bluFiEsp32Obj = require('../../utils/bluFiEsp32Utils.js');
import Toast from '../../utils/dist/toast/toast';

Page({
  data: {
    toast: null,
    timer: null,
    searching: false,
    devicesList: []
  },
  Search: function() {

    var that = this
    if (!that.data.searching) {
      wx.closeBluetoothAdapter({
        complete: function(res) {
          //console.log(res)
          wx.openBluetoothAdapter({
            success: function(res) {
              console.log(res)
              wx.getBluetoothAdapterState({
                success: function(res) {
                  console.log(res)
                }
              })
              wx.startBluetoothDevicesDiscovery({
                allowDuplicatesKey: false,
                success: function(res) {
                  let second = 15;
                  that.setData({
                    searching: true,
                    devicesList: [],
                    toast: Toast.loading({
                      duration: 0, // 持续展示 toast
                      forbidClick: true, // 禁用背景点击
                      message: `搜索中${second}秒.`,
                    })
                  })
                  that.data.timer = setInterval(() => {
                    second--;
                    if (second) {
                      if (second % 2)
                        that.data.toast.setData({
                          message: `搜索中${second}秒...`
                        });
                      else that.data.toast.setData({
                        message: `搜索中${second}秒..`
                      });
                    } else {
                      clearInterval(that.data.timer);
                      Toast.clear();
                      that.data.timer = null;
                      if (that.data.devicesList.length == 0)
                        Toast.fail('暂未发现设备');
                    }
                  }, 1000);
                }
              })
            },
            fail: function(res) {
              Toast.fail('蓝牙未开启');
              that.setData({
                searching: false
              })
            }
          })
        }
      })
    } else {
      wx.stopBluetoothDevicesDiscovery({
        success: function(res) {
          //console.log(res)
          that.setData({
            searching: false
          })
        }
      })
    }
  },
  Connect: function(e) {
    var that = this
    var advertisData, name
    //console.log(e.currentTarget.id)
    for (var i = 0; i < that.data.devicesList.length; i++) {
      if (e.currentTarget.id == that.data.devicesList[i].deviceId) {
        name = that.data.devicesList[i].name
        advertisData = that.data.devicesList[i].advertisData
      }
    }
    wx.stopBluetoothDevicesDiscovery({
      success: function(res) {
        //console.log(res)
        that.setData({
          searching: false
        })
      }
    })
    wx.showLoading({
      title: '连接蓝牙设备中...',
    })
    wx.createBLEConnection({
      deviceId: e.currentTarget.id,
      success: function(res) {
        console.log(res)
        wx.hideLoading()
        wx.showToast({
          title: '连接成功',
          icon: 'success',
          duration: 1000
        })
        wx.navigateTo({
          url: '../device/device?connectedDeviceId=' + e.currentTarget.id + '&name=' + name
        })
      },
      fail: function(res) {
        console.log(res)
        wx.hideLoading()
        wx.showModal({
          title: '提示',
          content: '连接失败',
          showCancel: false
        })
      }
    })
  },
  onLoad: function(options) {

    //console.log('getFilterDeviceName:' + bluFiEsp32Obj.getFilterDeviceName());
    //console.log('app.globalData.glodataEnum.PACKAGE_VALUE:' + app.globalData.dataEnum.PACKAGE_VALUE);
    var that = this
    var list_height = ((app.globalData.SystemInfo.windowHeight - 50) * (750 / app.globalData.SystemInfo.windowWidth)) - 60

    that.setData({
      list_height: list_height
    })

    wx.onBluetoothAdapterStateChange(function(res) {
      //console.log(res)
      that.setData({
        searching: res.discovering
      })
      if (!res.available) {
        that.setData({
          searching: false
        })
      }
    })

    wx.onBluetoothDeviceFound(function(devices) {

      //剔除重复设备，兼容不同设备API的不同返回值
      var isnotexist = true
      if (devices.deviceId) {
        if (devices.advertisData) {
          devices.advertisData = app.buf2hex(devices.advertisData)
        } else {
          devices.advertisData = ''
        }
        for (var i = 0; i < that.data.devicesList.length; i++) {
          if (devices.deviceId == that.data.devicesList[i].deviceId) {
            isnotexist = false
          }
        }
        if (isnotexist) {
          that.data.devicesList.push(devices)
        }
      } else if (devices.devices) {
        if (devices.devices[0].advertisData) {
          devices.devices[0].advertisData = app.buf2hex(devices.devices[0].advertisData)
        } else {
          devices.devices[0].advertisData = ''
        }
        console.log(devices.devices[0])
        for (var i = 0; i < that.data.devicesList.length; i++) {
          if (devices.devices[0].deviceId == that.data.devicesList[i].deviceId) {
            isnotexist = false
          }
        }
        if (isnotexist) {
          that.data.devicesList.push(devices.devices[0])
        }
      } else if (devices[0]) {
        if (devices[0].advertisData) {
          devices[0].advertisData = app.buf2hex(devices[0].advertisData)
        } else {
          devices[0].advertisData = ''
        }
        console.log(devices[0])
        for (var i = 0; i < devices_list.length; i++) {
          if (devices[0].deviceId == that.data.devicesList[i].deviceId) {
            isnotexist = false
          }
        }
        if (isnotexist) {
          that.data.devicesList.push(devices[0])
        }
      }
      //过滤名字
      let getDevicesList = bluFiEsp32Obj.getFilterDevice(that.data.devicesList);
      that.setData({
        devicesList: getDevicesList
      })
      //搜索到有设备，停止搜索，显示加载完成
      if (getDevicesList.length) {
        that.onHide();
        Toast.clear();
      }
    })
    this.Search();
  },
  onHide: function() {
    var that = this
    // that.setData({
    //   devicesList: []
    // })
    if (this.data.searching) {
      wx.stopBluetoothDevicesDiscovery({
        success: function(res) {
          //console.log(res)
          that.setData({
            searching: false
          })
        }
      })
    }
  },
  onUnload: function() {
    if (that.data.timer) {
      clearInterval(that.data.timer);
      that.data.timer = null;
    }
  }
})
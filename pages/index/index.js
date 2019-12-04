import Toast from '../../utils/dist/toast/toast';


Page({

    data: {
        blufiFilterName: "BLUFI"
    },
    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        var that = this;
        if (options.blufiResult){
          var result = options.blufiResult === 'ok' ? "配网成功" : "配网失败";
          wx.showToast({
            title: result,
            icon: 'none',
            duration: 2000
          });
        }




        wx.getStorage({
            key: 'blufiFilterName',
            success: function (res) {
                that.setData({
                    blufiFilterName: res.data
                });
            },
        })
    },
    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide: function () {
        var that = this
        wx.getStorage({
            key: 'blufiFilterName',
            success: function (res) {
                that.setData({
                    blufiFilterName: res.data
                });
            },
        })
    },
    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {

    },
    bindKeyInput: function (i) {
        this.setData({
            blufiFilterName: i.detail.value
        });
    },
    bindViewSerch: function () {
        var that = this
        if (!that.data.searching) {
            wx.closeBluetoothAdapter({
                complete: function (res) {
                    //console.log(res)
                    wx.openBluetoothAdapter({
                        success: function (res) {
                            wx.setStorage({
                                key: 'blufiFilterName',
                                data: that.data.blufiFilterName,
                                success: function (res) {
                                    console.log(res);
                                }
                            })
                            wx.navigateTo({
                                url: "/pages/search/search?blufiFilterName=" + that.data.blufiFilterName
                            });
                        },
                        fail: function (res) {
                            Toast.fail('蓝牙未开启');
                        }
                    })
                }
            })
        } else {
            wx.stopBluetoothDevicesDiscovery({
                success: function (res) {
                    console.log(res)
                }
            })
        }
    }
})

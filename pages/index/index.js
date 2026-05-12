Page({
  data: {
    devices: [], // 原始设备列表
    filteredDevices: [], // 过滤后的设备列表
    connected: false,
    chs: [],
    searching: false,
    status: '请点击搜索',
    filterName: '' // 过滤关键字
  },

  onLoad() {
    // 页面加载时可以尝试初始化，或者等用户点击
  },

  onUnload() {
    this.closeBluetoothAdapter()
  },

  openBluetoothAdapter() {
    wx.openBluetoothAdapter({
      success: (res) => {
        console.log('openBluetoothAdapter success', res)
        this.startBluetoothDevicesDiscovery()
      },
      fail: (res) => {
        if (res.errCode === 10001) {
          wx.showModal({
            title: '提示',
            content: '请检查手机蓝牙是否打开',
            showCancel: false
          })
          this.setData({ status: '蓝牙未打开' })
        } else {
          wx.showModal({
            title: '提示',
            content: '蓝牙初始化失败: ' + res.errMsg,
            showCancel: false
          })
          this.setData({ status: '初始化失败' })
        }
      }
    })
  },

  startBluetoothDevicesDiscovery() {
    if (this._discoveryStarted) {
      return
    }
    this._discoveryStarted = true
    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: true,
      success: (res) => {
        console.log('startBluetoothDevicesDiscovery success', res)
        this.setData({
          searching: true,
          status: '正在搜索周边设备...'
        })
        this.onBluetoothDeviceFound()
      },
    })
  },

  stopBluetoothDevicesDiscovery() {
    wx.stopBluetoothDevicesDiscovery()
    this._discoveryStarted = false
    this.setData({
      searching: false,
      status: '已停止搜索'
    })
  },

  onBluetoothDeviceFound() {
    wx.onBluetoothDeviceFound((res) => {
      res.devices.forEach(device => {
        if (!device.name && !device.localName) {
          return
        }
        const foundDevices = this.data.devices
        const idx = foundDevices.findIndex(d => d.deviceId === device.deviceId)
        
        // 更新原始列表
        if (idx === -1) {
          foundDevices.push(device)
        } else {
          foundDevices[idx] = device
        }
        
        // 触发过滤逻辑
        this.filterDevices(foundDevices)
      })
    })
  },

  // 过滤输入处理
  onFilterInput(e) {
    const value = e.detail.value
    this.setData({ filterName: value })
    this.filterDevices(this.data.devices)
  },

  // 执行过滤
  filterDevices(devices) {
    const keyword = this.data.filterName.toLowerCase()
    let result = devices
    
    if (keyword) {
      result = devices.filter(d => {
        const name = (d.name || d.localName || '').toLowerCase()
        return name.includes(keyword)
      })
    }
    
    this.setData({
      devices: devices, // 更新原始数据
      filteredDevices: result // 更新显示数据
    })
  },

  createBLEConnection(e) {
    const ds = e.currentTarget.dataset
    const deviceId = ds.deviceId
    const name = ds.name
    
    this.stopBluetoothDevicesDiscovery()
    
    wx.navigateTo({
      url: `/pages/device/device?deviceId=${deviceId}&name=${encodeURIComponent(name)}`,
    })
  },

  closeBluetoothAdapter() {
    wx.closeBluetoothAdapter()
    this._discoveryStarted = false
  },

  toggleSearch() {
    if (this.data.searching) {
      this.stopBluetoothDevicesDiscovery()
    } else {
      this.setData({ devices: [], filteredDevices: [] }) // 清空列表重新搜索
      this.openBluetoothAdapter()
    }
  }
})

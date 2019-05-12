//app.js
App({
  buf2hex: function(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('')
  },
  buf2string: function(buffer) {
    var arr = Array.prototype.map.call(new Uint8Array(buffer), x => x)
    var str = ''
    for (var i = 0; i < arr.length; i++) {
      str += String.fromCharCode(arr[i])
    }
    return str
  },
  onLaunch: function() {
    this.globalData.SystemInfo = wx.getSystemInfoSync()
    //console.log(this.globalData.SystemInfo)
  },
  globalData: {
    SystemInfo: {},
    dataEnum: {
      PACKAGE_VALUE: 0x01,
      SUBTYPE_NEG: 0x00,
      SUBTYPE_STA_WIFI_BSSID: 0x01,
      SUBTYPE_STA_WIFI_SSID: 0x02,
      SUBTYPE_STA_WIFI_PASSWORD: 0x03,
      SUBTYPE_SOFTAP_WIFI_SSID: 0x04,
      SUBTYPE_SOFTAP_WIFI_PASSWORD: 0x05,
      SUBTYPE_SOFTAP_MAX_CONNECTION_COUNT: 0x06,
      SUBTYPE_SOFTAP_AUTH_MODE: 0x07,
      SUBTYPE_SOFTAP_CHANNEL: 0x08,
      SUBTYPE_USERNAME: 0x09,
      SUBTYPE_CA_CERTIFICATION: 0x0a,
      SUBTYPE_CLIENT_CERTIFICATION: 0x0b,
      SUBTYPE_SERVER_CERTIFICATION: 0x0c,
      SUBTYPE_CLIENT_PRIVATE_KEY: 0x0d,
      SUBTYPE_SERVER_PRIVATE_KEY: 0x0e,
      SUBTYPE_WIFI_CONNECTION_STATE: 0x0f,
      SUBTYPE_VERSION: 0x10,
      SUBTYPE_WIFI_LIST: 0x11,
      SUBTYPE_ERROR: 0x12,
      SUBTYPE_CUSTOM_DATA: 0x13
    },
    controllEnum: {
      PACKAGE_VALUE: 0x00,
      SUBTYPE_ACK: 0x00,
      SUBTYPE_SET_SEC_MODE: 0x01,
      SUBTYPE_SET_OP_MODE: 0x02,
      SUBTYPE_CONNECT_WIFI: 0x03,
      SUBTYPE_DISCONNECT_WIFI: 0x04,
      SUBTYPE_GET_WIFI_STATUS: 0x05,
      SUBTYPE_DEAUTHENTICATE: 0x06,
      SUBTYPE_GET_VERSION: 0x07,
      SUBTYPE_CLOSE_CONNECTION: 0x08,
      SUBTYPE_GET_WIFI_LIST: 0x09
    }
  }
})
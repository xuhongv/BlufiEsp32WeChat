
//获取应用实例
const app = getApp()
const util = require('../../utils/blufi/util.js');
const crypto = require('../../utils/blufi/crypto/crypto-dh.js');
const md5 = require('../../utils/blufi/crypto/md5.min.js');
const aesjs = require('../../utils/blufi/crypto/aes.js');
let client = null;

const timeOut = 20;//超时时间
var timeId = "";
var sequenceControl = 0;
var sequenceNumber = -1;
Page({
  data: {
    failure: false,
    value: 0,
    desc: "Device connecting...",
    isChecksum: true,
    isEncrypt: true,
    flagEnd: false,
    defaultData: 1,
    ssidType: 2,
    passwordType: 3,
    meshIdType: 3,
    deviceId: "",
    ssid: "",
    uuid: "",
    serviceId: "",
    password: "",
    meshId: "",
    processList: [],
    result: [],
  },
  blueConnect: function (event) {
    var self = this;
    self.setProcess(0, util.descSucList[0]);
    sequenceControl = 0;
    sequenceNumber = -1;
    self.setData({
      fragList: [],
      flagEnd: false,
      serviceId: "",
      uuid: "",
    });
    wx.createBLEConnection({
      // 这里的 deviceId 需要已经通过 createBLEConnection 与对应设备建立链接 
      deviceId: self.data.deviceId,
      timeout: 10000,
      success: function (res) {
        self.setProcess(10, util.descSucList[1]);
        self.getDeviceServices(self.data.deviceId);
      },
      fail: function (res) {
        var num = self.data.blueConnectNum;
        if (num < 3) {
          self.blueConnect();
          num++;
          self.setData({
            blueConnectNum: num
          })
        } else {
        }
      }
    })
  },
  getDeviceServices: function (deviceId) {
    var self = this;
    self.setProcess(20, util.descSucList[2]);
    wx.getBLEDeviceServices({
      // 这里的 deviceId 需要已经通过 createBLEConnection 与对应设备建立链接 
      deviceId: deviceId,
      success: function (res) {
        var services = res.services;
        if (services.length > 0) {
          for (var i = 0; i < services.length; i++) {
            var uuid = services[i].uuid;
            if (uuid == app.globalData.service_uuid) {
              self.getDeviceCharacteristics(deviceId, uuid);
              return false;
            }
          }
        }
      },
      fail: function (res) {
      }
    })
  },
  getDeviceCharacteristics: function (deviceId, serviceId) {
    var self = this;
    self.setProcess(35, util.descSucList[3]);
    wx.getBLEDeviceCharacteristics({
      // 这里的 deviceId 需要已经通过 createBLEConnection 与对应设备建立链接 
      deviceId: deviceId,
      serviceId: serviceId,
      success: function (res) {
        var list = res.characteristics;
        if (list.length > 0) {
          for (var i = 0; i < list.length; i++) {
            var uuid = list[i].uuid;
            if (uuid == app.globalData.characteristic_write_uuid) {
              self.openNotify(deviceId, serviceId, uuid);
              self.setData({
                serviceId: serviceId,
                uuid: uuid,
              })
              return false;
            }
          }
        }
      },
      fail: function (res) {
      }
    })
  },
  //通知设备交互方式（是否加密）
  notifyDevice: function (deviceId, serviceId, characteristicId) {
    var self = this;
    client = util.blueDH(util.DH_P, util.DH_G, crypto);
    var kBytes = util.uint8ArrayToArray(client.getPublicKey());
    var pBytes = util.hexByInt(util.DH_P);
    var gBytes = util.hexByInt(util.DH_G);
    var pgkLength = pBytes.length + gBytes.length + kBytes.length + 6;
    var pgkLen1 = (pgkLength >> 8) & 0xff;
    var pgkLen2 = pgkLength & 0xff;
    var data = [];
    data.push(util.NEG_SET_SEC_TOTAL_LEN);
    data.push(pgkLen1);
    data.push(pgkLen2);
    var frameControl = util.getFrameCTRLValue(false, false, util.DIRECTION_OUTPUT, false, false);
    var value = util.writeData(util.PACKAGE_VALUE, util.SUBTYPE_NEG, frameControl, sequenceControl, data.length, data);
    var typedArray = new Uint8Array(value);
    wx.writeBLECharacteristicValue({
      deviceId: deviceId,
      serviceId: serviceId,
      characteristicId: characteristicId,
      value: typedArray.buffer,
      success: function (res) {
        self.getSecret(deviceId, serviceId, characteristicId, client, kBytes, pBytes, gBytes, null);
      },
      fail: function (res) {
      }
    })
  },
  getSecret: function (deviceId, serviceId, characteristicId, client, kBytes, pBytes, gBytes, data) {
    var self = this, obj = [], frameControl = 0;
    sequenceControl = parseInt(sequenceControl) + 1;
    if (!util._isEmpty(data)) {
      obj = util.isSubcontractor(data, true, sequenceControl);
      frameControl = util.getFrameCTRLValue(false, true, util.DIRECTION_OUTPUT, false, obj.flag);
    } else {
      data = [];
      data.push(util.NEG_SET_SEC_ALL_DATA);
      var pLength = pBytes.length;
      var pLen1 = (pLength >> 8) & 0xff;
      var pLen2 = pLength & 0xff;
      data.push(pLen1);
      data.push(pLen2);
      data = data.concat(pBytes);
      var gLength = gBytes.length;
      var gLen1 = (gLength >> 8) & 0xff;
      var gLen2 = gLength & 0xff;
      data.push(gLen1);
      data.push(gLen2);
      data = data.concat(gBytes);
      var kLength = kBytes.length;
      var kLen1 = (kLength >> 8) & 0xff;
      var kLen2 = kLength & 0xff;
      data.push(kLen1);
      data.push(kLen2);
      data = data.concat(kBytes);
      obj = util.isSubcontractor(data, true, sequenceControl);
      frameControl = util.getFrameCTRLValue(false, true, util.DIRECTION_OUTPUT, false, obj.flag);
    }
    var value = util.writeData(util.PACKAGE_VALUE, util.SUBTYPE_NEG, frameControl, sequenceControl, obj.len, obj.lenData);
    var typedArray = new Uint8Array(value);
    wx.writeBLECharacteristicValue({
      deviceId: deviceId,
      serviceId: serviceId,
      characteristicId: characteristicId,
      value: typedArray.buffer,
      success: function (res) {
        if (obj.flag) {
          self.getSecret(deviceId, serviceId, characteristicId, client, kBytes, pBytes, gBytes, obj.laveData);
        } else {
          setTimeout(function () {
            self.writeDeviceStart(deviceId, serviceId, characteristicId, null);
          }, 3000)
        }
      },
      fail: function (res) {
      }
    })
  },
  // 告知设备数据开始写入
  writeDeviceStart: function (deviceId, serviceId, characteristicId, data) {
    var self = this, obj = {}, frameControl = 0;
    self.setProcess(40, util.descSucList[4]);
    sequenceControl = parseInt(sequenceControl) + 1;
    if (!util._isEmpty(data)) {
      obj = util.isSubcontractor(data, self.data.isChecksum, sequenceControl, self.data.isEncrypt);
      frameControl = util.getFrameCTRLValue(self.data.isEncrypt, self.data.isChecksum, util.DIRECTION_OUTPUT, false, obj.flag);
    } else {
      obj = util.isSubcontractor([self.data.defaultData], self.data.isChecksum, sequenceControl, true);
      frameControl = util.getFrameCTRLValue(self.data.isEncrypt, self.data.isChecksum, util.DIRECTION_OUTPUT, false, obj.flag);
    }
    var defaultData = util.encrypt(aesjs, app.globalData.md5Key, sequenceControl, obj.lenData, true);
    var value = util.writeData(util.PACKAGE_CONTROL_VALUE, util.SUBTYPE_WIFI_MODEl, frameControl, sequenceControl, obj.len, defaultData);
    var typedArray = new Uint8Array(value)
    wx.writeBLECharacteristicValue({
      deviceId: deviceId,
      serviceId: serviceId,
      characteristicId: characteristicId,
      value: typedArray.buffer,
      success: function (res) {
        if (obj.flag) {
          self.writeDeviceStart(deviceId, serviceId, characteristicId, obj.laveData);
        } else {
          self.setProcess(60, util.descSucList[5]);
          self.writeRouterSsid(deviceId, serviceId, characteristicId, null);
        }
      },
      fail: function (res) {
        self.setFailProcess(true, util.descFailList[3]);
      }
    })
  },
  //写入路由ssid
  writeRouterSsid: function (deviceId, serviceId, characteristicId, data) {
    var self = this, obj = {}, frameControl = 0;
    sequenceControl = parseInt(sequenceControl) + 1;
    if (!util._isEmpty(data)) {
      obj = util.isSubcontractor(data, self.data.isChecksum, sequenceControl, self.data.isEncrypt);
      frameControl = util.getFrameCTRLValue(self.data.isEncrypt, self.data.isChecksum, util.DIRECTION_OUTPUT, false, obj.flag);
    } else {
      var ssidData = self.getCharCodeat(self.data.ssid);
      obj = util.isSubcontractor(ssidData, self.data.isChecksum, sequenceControl, self.data.isEncrypt);
      frameControl = util.getFrameCTRLValue(self.data.isEncrypt, self.data.isChecksum, util.DIRECTION_OUTPUT, false, obj.flag);
    }
    var defaultData = util.encrypt(aesjs, app.globalData.md5Key, sequenceControl, obj.lenData, true);
    var value = util.writeData(util.PACKAGE_VALUE, util.SUBTYPE_SET_SSID, frameControl, sequenceControl, obj.len, defaultData);
    var typedArray = new Uint8Array(value)
    wx.writeBLECharacteristicValue({
      deviceId: deviceId,
      serviceId: serviceId,
      characteristicId: characteristicId,
      value: typedArray.buffer,
      success: function (res) {
        if (obj.flag) {
          self.writeRouterSsid(deviceId, serviceId, characteristicId, obj.laveData);
        } else {
          self.writeDevicePwd(deviceId, serviceId, characteristicId, null);
        }
      },
      fail: function (res) {
        console.log(257);
        self.setFailProcess(true, util.descFailList[4]);
      }
    })
  },
  //写入路由密码
  writeDevicePwd: function (deviceId, serviceId, characteristicId, data) {
    var self = this, obj = {}, frameControl = 0;
    sequenceControl = parseInt(sequenceControl) + 1;
    if (!util._isEmpty(data)) {
      obj = util.isSubcontractor(data, self.data.isChecksum, sequenceControl, self.data.isEncrypt);
      frameControl = util.getFrameCTRLValue(self.data.isEncrypt, self.data.isChecksum, util.DIRECTION_OUTPUT, false, obj.flag);
    } else {
      var pwdData = self.getCharCodeat(self.data.password);
      obj = util.isSubcontractor(pwdData, self.data.isChecksum, sequenceControl, self.data.isEncrypt);
      frameControl = util.getFrameCTRLValue(self.data.isEncrypt, self.data.isChecksum, util.DIRECTION_OUTPUT, false, obj.flag);
    }
    var defaultData = util.encrypt(aesjs, app.globalData.md5Key, sequenceControl, obj.lenData, true);
    var value = util.writeData(util.PACKAGE_VALUE, util.SUBTYPE_SET_PWD, frameControl, sequenceControl, obj.len, defaultData);
    var typedArray = new Uint8Array(value)
    
    wx.writeBLECharacteristicValue({
      deviceId: deviceId,
      serviceId: serviceId,
      characteristicId: characteristicId,
      value: typedArray.buffer,
      success: function (res) {
        if (obj.flag) {
          self.writeDevicePwd(deviceId, serviceId, characteristicId, obj.laveData);
        } else {
          self.writeDeviceEnd(deviceId, serviceId, characteristicId);
        }
      },
      fail: function (res) {
        self.setFailProcess(true, util.descFailList[4]);
      }
    })
  },
  //告知设备写入结束
  writeDeviceEnd: function (deviceId, serviceId, characteristicId) {
    var self = this;
    sequenceControl = parseInt(sequenceControl) + 1;
    var frameControl = util.getFrameCTRLValue(self.data.isEncrypt, false, util.DIRECTION_OUTPUT, false, false);
    var value = util.writeData(self.data.PACKAGE_CONTROL_VALUE, util.SUBTYPE_END, frameControl, sequenceControl, 0, null);
    var typedArray = new Uint8Array(value)
    wx.writeBLECharacteristicValue({
      deviceId: deviceId,
      serviceId: serviceId,
      characteristicId: characteristicId,
      value: typedArray.buffer,
      success: function (res) {
        self.onTimeout(0);
      },
      fail: function (res) {
        self.setFailProcess(true, util.descFailList[4]);
      }
    })
  },
  //连接超时
  onTimeout: function (num) {
    const self = this;
    console.log(319);
    if (timeId != "") {
      clearInterval(timeId);
    }
    timeId = setInterval(function () {
      if (num < timeOut) {
        num++;
      } else {
        clearInterval(timeId);
        console.log(324);
        self.setFailProcess(true, util.descFailList[4]);
      }
    }, 1000)
  },
  //监听通知
  onNotify: function () {
    var self = this;
    wx.onBLECharacteristicValueChange(function (res) {
      self.getResultType(util.ab2hex(res.value));
    })
  },
  //启用通知
  openNotify: function (deviceId, serviceId, characteristicId) {
    var self = this;
    wx.notifyBLECharacteristicValueChange({
      state: true, // 启用 notify 功能
      deviceId: deviceId,
      serviceId: serviceId,
      characteristicId: app.globalData.characteristic_read_uuid,
      success: function (res) {
        self.notifyDevice(deviceId, serviceId, characteristicId);
        self.onNotify();
      },
      fail: function (res) {
      }
    })
  },
  getSsids: function (str) {
    var list = [],
      strs = str.split(":");
    for (var i = 0; i < strs.length; i++) {
      list.push(parseInt(strs[i], 16));
    }
    return list;
  },
  getCharCodeat: function (str) {
    var list = [];
    for (var i = 0; i < str.length; i++) {
      list.push(str.charCodeAt(i));
    }
    return list;
  },
  setProcess: function (value, desc) {
    var self = this, list = [];
    list = self.data.processList;
    list.push(desc);
    self.setData({
      value: value,
      processList: list
    });
    if (value == 100) {
      self.closeConnect();
      self.setData({
        desc: util.descSucList[6]
      });
      clearInterval(timeId);
      sequenceControl = 0;
      self.saveWifi();
      wx.showToast({
        title: '配网成功',
        icon: 'none',
        duration: 2000
      })
      setTimeout(function () {
        wx.reLaunch({
          url: '/pages/index/index'
        })
      }, 3000)
    }
  },
  setFailProcess: function (flag, desc) {
    var self = this, list = [];
    list = self.data.processList;
    list.push(desc);
    self.setFailBg();
    self.setData({
      failure: flag,
      processList: list,
      desc: desc,
    });
  },
  getResultType: function (list) {
    var self = this;
    var result = self.data.result;
    console.log(result);
    if (list.length < 4) {
      cosnole.log(407);
      self.setFailProcess(true, util.descFailList[4]);
      return false;
    }
    var val = parseInt(list[0], 16),
      type = val & 3,
      subType = val >> 2;
    console.log(type, subType);
    var dataLength = parseInt(list[3], 16);
    if (dataLength == 0) {
      return false;
    }
    var fragNum = util.hexToBinArray(list[1]);
    list = util.isEncrypt(self, fragNum, list, app.globalData.md5Key);
    result = result.concat(list);
    self.setData({
      result: result,
    })
    if (self.data.flagEnd) {
      self.setData({
        flagEnd: false,
      })
      if (type == 1) {
        if (subType == 15) {
          console.log(result);
          for (var i = 0; i <= result.length; i++) {
            var num = parseInt(result[i], 16) + "";
            console.log(num);
            if (i == 0) {
              self.setProcess(85, "Connected: " + util.successList[num]);
            } else if (i == 1) {
              if (num == 0) {
                self.setProcess(100, util.descSucList[6]);
              }
            }
          }
        } else if (subType == 18) {
          for (var i = 0; i <= result.length; i++) {
            var num = parseInt(result[i], 16) + "";
            if (i == 0) {
              self.setProcess(85, util.successList[num]);
            } else if (i == 1) {
              self.setFailProcess(true, util.failList[num]);
            }
          }
        } else if (subType == util.SUBTYPE_NEGOTIATION_NEG) {
          var arr = util.hexByInt(result.join(""));
          var clientSecret = client.computeSecret(new Uint8Array(arr));
          var md5Key = md5.array(clientSecret);
          app.globalData.md5Key = md5Key;
          self.setData({
            result: [],
          })
          self.writeDeviceStart(self.data.deviceId, self.data.serviceId, self.data.uuid, null);
        } else {
          console.log(468);
          self.setFailProcess(true, util.descFailList[4])
        }
      } else {
        console.log(472);
        self.setFailProcess(true, util.descFailList[4])
      }
    }
  },
  saveWifi: function () {
    var self = this;
    wx.getStorage({
      key: 'WIFIINFO',
      success(res) {
        var data = res.data;
        console.log(data);
        if (!util._isEmpty(data)) {
          var flag = false;
          for (var i in data) {
            if (data[i].name == self.data.ssid) {
              data[i].password = self.data.password;
              flag = true;
              return false;
            }
          }
          if (!flag) {
            data.push({ name: self.data.ssid, password: self.data.password })
          }

        } else {
          data = [];
          data.push({ name: self.data.ssid, password: self.data.password })
        }
        wx.setStorage({
          key: "WIFIINFO",
          data: data
        })
      },
      fail: function (res) {
        var data = [];
        data.push({ name: self.data.ssid, password: self.data.password });
        wx.setStorage({
          key: "WIFIINFO",
          data: data
        })
      }
    })

  },
  closeConnect: function () {
    var self = this;
    wx.closeBLEConnection({
      deviceId: self.data.deviceId,
      success: function (res) {
        console.log(res);
      }
    })
    wx.closeBluetoothAdapter({
      success: function () {
      }
    });
  },
  //设置配网失败背景色
  setFailBg: function () {
    wx.setNavigationBarColor({
      frontColor: "#ffffff",
      backgroundColor: '#737d89',
    })
  },
  //设置配网成功背景色
  setSucBg: function () {
    wx.setNavigationBarColor({
      frontColor: "#ffffff",
      backgroundColor: '#109ec3',
    })
  },
  onLoad: function (options) {
    var self = this;
    self.setSucBg();
    wx.setNavigationBarTitle({
      title: '配网'
    });
    self.setData({
      deviceId: options.deviceId,
      ssid: unescape(options.ssid),
      password: unescape(options.password),
    })
    sequenceControl = options.sequenceControl;
    self.blueConnect();
  },
  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    this.closeConnect();
  },
})

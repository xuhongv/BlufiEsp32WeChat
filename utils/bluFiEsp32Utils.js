//蓝牙设备名字过滤
let filterDeviceName = 'BLUFI';

//设置过滤的蓝牙名字
function setFilterDeviceName(newName) {
  filterDeviceName = newName;
}

//获取过滤的蓝牙名字
function getFilterDeviceName() {
  return filterDeviceName;
}

//传入手机搜索到的全部蓝牙设备名字，进行筛选设备
function getFilterDevice(devicesList) {
  let arryDevices =[];
  for (let i = 0; i < devicesList.length;i++){
    var patt = new RegExp(filterDeviceName); 
    if ((devicesList[i].name) && patt.test(devicesList[i].name))
    {
      arryDevices.push(devicesList[i]);
    }  
  }
  return arryDevices;

}


module.exports = {
  setFilterDeviceName: setFilterDeviceName,//设置过滤的蓝牙名字
  getFilterDeviceName: getFilterDeviceName,//获取过滤的蓝牙名字
  getFilterDevice: getFilterDevice,//传入手机搜索到的全部蓝牙设备名字，进行筛选设备
}

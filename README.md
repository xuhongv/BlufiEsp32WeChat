## 原帖地址
https://www.cnblogs.com/HintLee/p/9499423.html
## 说明
鸽了很久终于来完善一下，此源码适用于微信小程序。之前研究小程序的蓝牙踩了不少坑，重新提取了相关内容作了一个 Demo，有搜索设备、连接设备、写入内容、notify 读取内容等功能，在 BLE 串口透传模块上测试通过。
## 注意
search 页面基本不需改动可直接使用，device 页面中固定了 services 和 characteristics，发送和接收都是字符串，根据需求修改即可。

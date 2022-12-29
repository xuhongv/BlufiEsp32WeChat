
<p align="center">
  <!-- <a href="http://doc.mini.7yue.pro/"> -->
    <img
      class="QR-img" src="http://qinniu.xuhongv.com/gh_57026554c41a_258.jpg">
  <!-- </a> -->
</p>

<div align="center"> <span class="logo" > BlufiEsp32WeChat </span> </div>

<div class="row" />
<div align="center">
  <span class="desc" >让微信小程序也可以配网设备</span> 
</div>


## 维护日志，版本修订；

|修改时间|更新日志|
|----|----|
|2019.5.17|初次拟稿，完成配网，暂不开放|
|2019.11.30|首次开源|
|2019.12.4|去除全局配置文件，增加对外使用文档|
|2022.12.20|增加MTU设置|
|2022.12.29|修改为获取模组周围SSID|

## 一、简介

BlufiEsp32WeChat 是基于 **微信小程序蓝牙配网设备** 实现的开源仓库，致力开源国内互联网。

周所周知，目前市面上很多都是基于原生app做的配网，而在小程序实现和开源是极少的。本人参考官网示范，做了一个蓝牙配网demo，仅仅适合esp32。


## 二、如何集成

- 1.首先把 《blufi》 这个配网核心库所需文件夹放在你的工程里面；
- 2.为了方便，直接把 《images》下面的图片复制到自己到工程里面，以及把界面《bleConnect》也复制到自己到工程里面去；
- 3.蓝牙搜索附近设备展示列表，自行处理；最后要传给界面《bleConnect》到参数只有四个：

|参数|含义|
|----|----|
|deviceId|要连接的蓝牙设备的deviceId|
|ssid|要连接的路由器的名字|
|password|要连接的路由器的密码|
|callBackUri|自定义配网回调结果的界面（比如 /pages/index/index ）|

- 4.比如这样：

```
wx.navigateTo({
  url: '/pages/blueConnect/index?deviceId=123456&ssid=TP-xx&password=12345678&callBackUri=/pages/index/index"
  })
```
- 5.其中，当配网不管成功与否，都会带参数跳转到 callBackUri 这个定义的页面；参数名为 ```blufiResult``` 如下：

|参数|含义|
|----|----|
|true|配网成功|
|false|配网失败|

- 6.比如这样处理：

```
    //生命周期函数--监听页面加载 
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
     }
```

## 三、本人开源 微信物联网控制 一览表

|开源项目|地址|开源时间|
|----|----|----|
|微信小程序连接mqtt服务器，控制esp8266智能硬件|https://github.com/xuhongv/WeChatMiniEsp8266|2018.11|
|微信公众号airkiss配网以及近场发现在esp8266 rtos3.1 的实现|https://github.com/xuhongv/xLibEsp8266Rtos3.1AirKiss|2019.3|
|微信公众号airkiss配网以及近场发现在esp32 esp-idf 的实现|https://github.com/xuhongv/xLibEsp32IdfAirKiss|2019.9|
|微信小程序控制esp8266实现七彩效果项目源码| https://github.com/xuhongv/WCMiniColorSetForEsp8266|2019.9|
|微信小程序蓝牙配网blufi实现在esp32源码| https://github.com/xuhongv/BlufiEsp32WeChat|2019.11|
|微信小程序蓝牙ble控制esp32七彩灯效果| https://blog.csdn.net/xh870189248/article/details/101849759|2019.10|
|可商用的事件分发的微信小程序mqtt断线重连框架|https://blog.csdn.net/xh870189248/article/details/88718302|2019.2|
|微信小程序以 websocket 连接阿里云IOT物联网平台mqtt服务器|https://blog.csdn.net/xh870189248/article/details/91490697|2019.6|
|微信公众号网页实现连接mqtt服务器|https://blog.csdn.net/xh870189248/article/details/100738444|2019.9|


## 四、讨论交流

<table>
  <tbody>
    <tr >
      <td align="center" valign="middle" style="border-style:none">
       <img class="QR-img" height="260" width="260" src="https://aithinker-static.oss-cn-shenzhen.aliyuncs.com/bbs/important/qq_group.png">
        <p style="font-size:12px;">QQ群号：434878850</p>
      </td>
      <td align="center" valign="middle" style="border-style:none">
        <img class="QR-img" height="260" width="260" src="https://aithinker-static.oss-cn-shenzhen.aliyuncs.com/bbs/important/wechat_account.jpg">
        <p style="font-size:12px;">本人微信公众号：徐宏blog</p>
      </td>
      <td align="center" valign="middle" style="border-style:none">
        <img class="QR-img" height="260" width="260" src="https://aithinker-static.oss-cn-shenzhen.aliyuncs.com/bbs/important/wechat_me.jpg">
        <p style="font-size:12px;">私人工作微信，添加标明来意</p>
      </td>
    </tr>
  </tbody>
</table>




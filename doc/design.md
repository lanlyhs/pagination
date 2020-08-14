# Pagination Design

## 方案一：旧版偏移量

### 首次进入列表页 / 加载新页面 / 加载旧页面

1. 通过传入 page, pageSize 来分页。

## 方案二：游标分页

### 首次进入列表页

1. 通过接口获取第一页列表数据

### 加载新页面

1. 请求接口

### 加载旧页面

1. 请求接口

## 方案三：游标加推送

### 首次进入列表页

1. 通过接口获取第一页列表数据
2. 绑定 Websocket 连接
3. 有新数据就向前端 Push

### 加载新页面

1. 等待 Websocket 推送。

### 加载旧页面

1. 请求接口

## TIPS

1. 前端在用户接近列表末尾时加载下一个条目。
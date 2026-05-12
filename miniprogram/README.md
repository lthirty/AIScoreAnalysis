# AIScoreAnalysis 微信小程序端

这是正式迁移到微信小程序的起步工程目录，建议使用 Taro + React 维护。当前目录先提供页面、服务和数据契约骨架，避免继续把 Web 端 `dist/` 当成小程序源码。

## 本地初始化

```bash
cd miniprogram
npm install
npm run dev:weapp
```

然后用微信开发者工具打开：

```text
miniprogram/dist
```

## 关键约束

- 小程序端不允许保存阿里百炼、MiniMax、DeepSeek Key。
- 小程序端只调用自己的后端 API。
- 微信登录使用 `wx.login`，后端换取 openid 并签发业务 token。
- 历史成绩正式版保存到后端数据库，本地缓存只做加速和离线草稿。
- 10K 用户阶段同步接口可满足；扩展到 100K 用户/100 并发时，OCR 和增强分析应切到异步任务队列。

## 设计原则

- 按微信小程序原生体验设计，不把 H5 双栏界面搬进小程序。
- 所有核心页面保持单列布局，优先适配手机单手操作。
- 首页是工作台：微信账号、历史趋势摘要、城市/年级/日期、导入截图、手动输入。
- AI 分析必须展示依据和模型名称；没有图片、题型得分或文字描述依据时，不能编造具体知识点。
- 详细设计见 `../docs/wechat-miniprogram-product-design.md`。

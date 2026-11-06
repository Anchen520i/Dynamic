# MYSTIC Interactive · 部署指南

## 文件布局

将压缩包内的文件放到 `Vaerios/Nyora` 的 **Surge 分支根目录**。不要将 `assets/` 里的 SVG 单独移动。

```text
README.md
index.html
styles.css
app.js
DEPLOY.md
.nojekyll
assets/
  routing-architecture.svg
  application-policies.svg
  rule-priority.svg
  resource-ecosystem.svg
  diagnostic-loop.svg
```

## GitHub Pages

1. 在 GitHub 打开 `Vaerios/Nyora` → **Settings** → **Pages**。
2. **Build and deployment** 选择 **Deploy from a branch**。
3. **Branch** 选择 `Surge`，目录选择 `/(root)`，然后保存。
4. 等待 GitHub Pages 部署完成，访问 `https://vaerios.github.io/Nyora/`。若仓库已配置自定义域名或不同的 Pages 来源，以 GitHub 显示的实际 URL 为准。
5. README 的交互式主页链接使用上述默认项目站地址；如更改域名，请同步修改 README。

> 以上步骤只指导部署；生成压缩包不会自动推送到 GitHub。

## 本地预览

可以直接打开 `index.html`，也可以使用静态 HTTP 服务器：

```bash
python3 -m http.server 8000
```

浏览器访问 `http://localhost:8000/`。不需要 npm、打包工具或 CDN。

## 音乐行为与限制

- 背景音乐为用户提供的《荒》，转换为 `assets/audio/background.mp3`，请随网站文件一并上传。公开发布前请确认具有必要的音乐使用及传播授权。
- 用户点击「进入沉浸体验」、顶部音乐按钮或底部播放器后，浏览器才会尝试启动声音。
- 滚动页面不会自动启动有声播放；移动端浏览器通常要求明确用户手势。
- 允许暂停、重新播放和调整音量；切换到后台时自动暂停。
- `prefers-reduced-motion` 用户的页面入场动画会被禁用。
- 音乐与图表动画均不收集用户数据；页面本身无分析脚本。

## 内容边界

- 当前配置中的节点订阅是占位符，`http://sol/...` 和 `http://astra/...` 是自定义资源地址，不能保证在其他设备直接可用。
- GitHub Pages 是静态网站，不会连接或远程控制你的 Surge 实例，也不会展示实时网络状态。
- 发布前请审计公开仓库中的 HTTP API 密钥、订阅链接、证书与其他敏感信息。
- README 的 SVG 动画是否播放取决于 GitHub 的渲染环境；GitHub Pages 直接加载 SVG 的表现通常更完整。

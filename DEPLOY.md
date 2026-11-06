# MYSTIC Interactive · 多歌曲部署指南

1. 在公开发布前，确认对全部 16 首音乐拥有网络传播授权。未获授权时不要上传音频文件到公开仓库。
2. 备份 `Surge` 分支，上传本包根目录内容到 `Vaerios/Nyora` 的 `Surge` 分支根目录。不要删除原有 `File/`、`Rule/` 等目录。
3. 在 Settings → Pages 中选择 `Deploy from a branch`，分支 `Surge`，目录 `/(root)`。如果已有网站配置，请先确认再修改。
4. 等待 Actions 成功，访问 https://vaerios.github.io/Nyora/ 。
5. 点击「进入沉浸体验」或播放器播放按钮启动音频。打开歌单选择歌曲；播放器支持上下曲、播放暂停、进度、音量、顺序播放、单曲循环、随机播放。
6. 新增歌曲时，放入 `assets/audio/`，在 `assets/audio/playlist.json` 添加标题、歌手、路径与秒数。

注意：Safari 不允许未经用户交互自动有声播放；音乐按需加载。部分上传的 FLAC 源文件出现解码警告，建议逐首试听验收。网页不依赖外部 JavaScript 或 CDN。

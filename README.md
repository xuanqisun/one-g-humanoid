# ONE-G · Humanoid motion & control

ONE-G 人形技术展示，围绕遥操作、跨本体迁移、高效动作学习组织内容。设计参考 SuperMimic 的浅色留白、清晰标题和视频优先叙事，页面代码独立实现。

## Preview

```sh
npm run dev
```

访问 http://127.0.0.1:4173 。纯静态 HTML/CSS/JavaScript，无依赖安装、API Key、后端或构建步骤。

```sh
npm run check
```

GitHub Pages 使用 `.github/workflows/pages.yml` 发布，Source 设为 GitHub Actions。推送到 `main` 后自动校验并发布。

## Content

- 遥操作：三点与全身两种入口；三点遥操使用双模式真机视频，全身遥操使用俯身抓取视频。
- 仿真演示：MorphMimic、Any2Any × SONIC 与 SuperMimic 共用一组标签。MorphMimic 分两行展示智元 X2、宇树 H2，Any2Any × SONIC 展示宇树 H2；SuperMimic 展示 G1 的后空翻、侧手翻、前空翻。各组支持暂停和放大播放，保留各自的机器人与仿真来源标注。
- 高效学习：ONE-G 的 SuperMimic G1 与 MorphMimic H2/G1 训练记录，支持四类曲线、迭代回放与独立仿真测试成绩。
- 技术路线：SONIC、Any2Any、MorphMimic、SuperMimic 原论文/项目图、步骤和原始来源。
- 演示库：原网站演示与保留的 X2 MorphMimic 视频，支持真机/仿真筛选与弹窗播放。
- 中文 / English，支持键盘操作、减少动态效果偏好、按需加载视频。
- 遥操和全部视频弹窗统一使用浅灰渐变播放控件，保留播放、进度、声音与全屏操作。

主要内容与视频索引在 `script.js`；结构在 `index.html`；布局在 `styles.css`。训练交互在 `training.js`，数据口径和重新生成步骤见 [训练数据说明](docs/TRAINING_DATA.md)。

## Assets and attribution

ONE-G logo 和演示视频来自用户提供的素材及原项目 `xuanqisun/g1-humanoid-teleoperation`。论文配图属于原作者，来源记录在 [docs/SOURCES.md](docs/SOURCES.md)。没有复用 SuperMimic 的机器人动画或视频作为 ONE-G 演示。

原视频保留在用户原素材目录。网页中的双模式真机视频转换为兼容浏览器的 H.264，缩小到 560 × 1270 并移除音轨；保留全长，不修改演示内容。首屏为 G1 俯身抓取实拍。

白底动作视频位于 `assets/videos/motion/`，对应海报位于 `assets/images/motion/`。9 段视频统一裁为 1200 × 1080，裁去两侧留白和烧录标题，保留动作、阴影与 50 fps。G1 后空翻按要求取前 7 秒，其余视频保留全长。桌面端每组 3 段并排循环，移动端横向滑动；离屏暂停，遵循减少动态效果与节省流量偏好。

文案采用简洁的技术标题，不加句号；正文直接说明输入、方法和效果。页面只保留必要来源，详细实验条件集中于来源文档。

后续素材建议见 [docs/NEXT_ASSETS.md](docs/NEXT_ASSETS.md)。

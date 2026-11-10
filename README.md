# ONE-G · Humanoid motion & control

ONE-G 人形技术展示，围绕自然遥操、跨本体迁移、高效动作学习组织内容。设计参考 SuperMimic 的浅色留白、清晰标题和视频优先叙事，页面代码独立实现。

## Preview

```sh
npm run dev
```

访问 http://127.0.0.1:4173 。纯静态 HTML/CSS/JavaScript，无依赖安装、API Key、后端或构建步骤。

```sh
npm run check
```

GitHub Pages: `main` 分支、`/` 根目录。所有本地资源均使用相对路径，可用于项目级 Pages 路径。

## Content

- 遥操作：三点与全身两种入口；三点遥操使用双模式真机视频，全身遥操使用俯身抓取视频。
- 跨本体：ONE-G 提供的 H2、X2 MorphMimic 仿真演示；Any2Any 和 MorphMimic 两条方法路线。
- 高效学习：有明确出处和实验限定的论文 GPU 指标，不表述为 ONE-G 自测。
- 技术路线：SONIC、Any2Any、MorphMimic、SuperMimic 原论文/项目图、步骤和原始来源。
- 演示库：9 个原网站演示，支持真机/仿真筛选与弹窗播放。
- 中文 / English，支持键盘操作、减少动态效果偏好、按需加载视频。

主要内容与视频索引在 `script.js`；结构在 `index.html`；布局在 `styles.css`。

## Assets and attribution

ONE-G logo 和演示视频来自用户提供的素材及原项目 `xuanqisun/g1-humanoid-teleoperation`。论文配图属于原作者，来源记录在 [docs/SOURCES.md](docs/SOURCES.md)。没有复用 SuperMimic 的机器人动画或视频作为 ONE-G 演示。

原视频保留在用户原素材目录。网页中的双模式真机视频转换为兼容浏览器的 H.264，缩小到 560 × 1270 并移除音轨；保留全长，不修改演示内容。首屏为 G1 俯身抓取实拍。

文案采用简洁的技术标题，不加句号；正文直接说明输入、方法和效果。页面只保留必要来源，详细实验条件集中于来源文档。

后续素材建议见 [docs/NEXT_ASSETS.md](docs/NEXT_ASSETS.md)。

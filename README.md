# SillyTavern Preset Editor

SillyTavern Completion 预设的可视化编辑器。支持将 JSON 预设转换为 Markdown 进行编辑，再合并回 JSON 导出。

在线地址：**https://cyanflower.github.io/SillyTavern-Preset-Editor/**

---

## 功能

### 核心工作流

```
加载/新建 JSON → 转换为 Markdown → 在编辑器中修改 → 合并回 JSON 导出
```

### 编辑器

- 左侧 Markdown 编辑器（CodeMirror 6）
- 右侧条目卡片列表，支持拖拽排序
- 左右双向实时同步
- 条目颜色条按 role（system/user/assistant）着色

### 条目管理

- 新增/删除条目
- 设置 role、position、depth、order 等元数据
- Marker 条目（chatHistory、worldInfoBefore 等）的启用/禁用与参数配置
- 缺失标准 Marker 时实时横幅提示，支持一键自动补全

### 文件操作

| 操作 | 说明 |
|------|------|
| 新建 | 基于默认模板创建新预设（含标准 Markers） |
| 加载 JSON | 从本地加载现有预设文件 |
| 导入 MD | 将 Markdown 文件导入到当前预设 |
| 导入 JSON | 与另一个预设进行条目合并 + 采样参数对比（两步流程） |
| 采样参数编辑 | 直接编辑当前预设的采样参数 |
| 导出 MD | 将当前状态导出为 Markdown 文件 |
| 导出 JSON | 合并为新 JSON 导出（导出前校验标准 Markers） |

### 合并预览（ChangePreview）

- 展示 unchanged / modified / added / removed 四类变更
- 每条可独立决策（保留当前/使用新版/纳入/删除）
- 可展开查看元数据 diff 与内容摘要
- 拖拽调整合并后顺序

### 采样参数对比

导入 JSON 时对比 12 个采样参数（temperature、top_p、top_k、top_a、min_p、frequency_penalty、presence_penalty、repetition_penalty、openai_max_context、openai_max_tokens、seed、reasoning_effort），逐项选择保留当前值或使用导入值。

---

## 本地开发

```bash
cd converter
npm install
npm run dev
```

类型检查：

```bash
npx vue-tsc --noEmit
```

---

## 技术栈

- Vue 3 + TypeScript
- Vite
- CodeMirror 6
- 纯前端静态部署（GitHub Pages）

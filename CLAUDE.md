# CLAUDE.md — SillyTavern Preset Converter

## 维护指令

**每次完成操作后，必须更新本文件的「已实现功能」和「待办/规划」两节，保持与代码实际状态同步。** 如果某个功能新增、修改或删除，请同步反映在对应章节中。不需要记录过程细节，只记录最终状态。

---

## 项目概述

Vue 3 + TypeScript 的 SillyTavern Completion Preset 编辑器。核心工作流：

```
加载/新建 JSON → 转换为 Markdown → 在编辑器中修改 → 合并回 JSON 导出
```

- **仅个人使用**，无需后端，纯前端静态部署
- 工作目录：`/data/project-antaeus/converter/`
- 开发命令：`npm run dev`（在 converter/ 下运行）
- 类型检查：`npx vue-tsc --noEmit`
- 部署：GitHub Pages，自动 CI/CD（`.github/workflows/deploy.yml`），Vite `base` 按 `NODE_ENV` 切换

---

## MD 格式规范（核心约定，改动前必读）

### 文件头部

```markdown
<!-- preset-converter-version: 1.0 -->
<!-- source: filename.json -->
<!-- prompt_order_character_id: 100001 -->
```

### 条目结构

```markdown
---

## 条目名称
<!-- id: uuid | role: system | enabled: true | depth: 4 -->

<entry-content>
实际内容（可包含任意 Markdown，含 ## 标题和 --- 分隔线）
</entry-content>

---

## Marker 条目名称 [MARKER]
<!-- id: chatHistory | marker: true | enabled: true -->
```

### 元数据字段规则

| 字段 | 说明 |
|------|------|
| `id` | UUID 或内置标识符（如 `chatHistory`） |
| `role` | `system` / `user` / `assistant` |
| `enabled` | `true` / `false` |
| `depth` | 注入深度（整数） |
| `position` | `0`=相对位置（默认，**省略不写**），`1`=聊天中 |
| `order` | 注入排序，默认 100，**等于 100 或 null 时省略** |
| `system_prompt` | 为 `true` 时写入，`false` 时省略 |
| `forbid_overrides` | 为 `true` 时写入，`false` 时省略 |
| `trigger` | 触发关键词，逗号分隔，空时省略 |
| `marker: true` | 仅 marker 条目写入 |

### Marker 条目的特殊处理

- `chatHistory` 和 `dialogueExamples`：只有 `marker: true` + `enabled`，**无** role/depth/position/order
- 其余 marker（worldInfoBefore、charDescription 等）：有 role/depth/position/order
- Marker 条目**无** `<entry-content>` 块

### 内容保留规则

- 内容**不** `.trim()`，首尾空行原样保留（用于控制条目间距）
- 解析时只去掉 `<entry-content>` 标签本身带来的首尾各一个 `\n`
- 解析器按 `<entry-content>` / `</entry-content>` 定界，因此内部的 `## ` 不会触发条目分割

---

## 关键文件索引

```
src/
├── types/preset.ts          # TS 类型定义（SillyTavernPreset、ParsedEntry 等）
├── core/
│   ├── json-to-md.ts        # JSON → MD 转换（jsonToMd）
│   ├── md-parser.ts         # MD → ParsedEntry[]（parseMdWithMarkers）
│   ├── merge-back.ts        # MD + 原始 JSON → 新 JSON（mergeBack）
│   ├── diff-entries.ts      # 条目 diff（buildMergeList、applyMergeList）
│   ├── json-import.ts       # JSON 条目提取 + 采样参数 diff（SAMPLING_KEYS 已 export）
│   └── default-template.ts  # 默认 ST 预设模板（createDefaultPreset）+ REQUIRED_MARKERS 常量
├── composables/
│   └── usePresetStore.ts    # 全局状态单例（模块级 refs）
├── components/
│   ├── App.vue              # 顶栏 + 弹窗编排
│   ├── EditorPanel.vue      # 左右双栏编辑器
│   ├── MarkdownEditor.vue   # CodeMirror 6 封装
│   ├── EntryList.vue        # 右侧条目列表（含拖拽排序）
│   ├── EntryCard.vue        # 单个条目卡片（含颜色条拖拽手柄）
│   ├── ChangePreview.vue    # 合并预览列表（含决策控件 + 拖拽排序）
│   ├── ImportDialog.vue     # 导入 MD 弹窗
│   ├── ImportJsonDialog.vue # 导入 JSON 弹窗（条目合并 + 采样参数对比，两步）
│   ├── SamplingParamsDialog.vue # 独立采样参数编辑弹窗
│   └── SaveDialog.vue       # 保存命名弹窗
└── style.css                # 全局 CSS 变量（dark theme）
```

---

## 架构要点

### 全局状态单例

`usePresetStore` 的 refs（`originalPreset`、`filename`、`mdText`、`entries`、`loaded`）声明在**模块作用域**（函数外），所有组件调用 `usePresetStore()` 共享同一份状态。

### 同步锁

`syncSource: 'left' | 'right' | null` 防止循环更新：
- 左侧 MD 编辑 → `syncSource='left'` → 更新 entries，右侧感知但不回写
- 右侧条目编辑 → `syncSource='right'` → 重建 MD，左侧感知但不回解析

### 导出 JSON 的核心流程

```
mdText  →  mergeBack(mdText, originalPreset)  →  新 JSON
```

`mergeBack` 以 `originalPreset` 为基底（保留采样参数等），按 id 匹配条目：修改/新增/删除，重建 `prompt_order`。

### character_id 约定

始终使用 `character_id: 100001`（`TARGET_CHARACTER_ID` 常量），读取和写入 `prompt_order` 均针对此 ID。

### 无 JSON 时导入 MD

点击「导入 MD」若无已加载文件，自动调用 `store.createNew()`（基于 `default-template.ts`）作为基底，再打开 ImportDialog。

---

## 已实现功能

### 核心转换
- [x] JSON → MD 转换（`jsonToMd`）
- [x] MD 解析（`parseMdWithMarkers`，`<entry-content>` 内的 `##` 不触发分割）
- [x] MD + JSON → 新 JSON 合并（`mergeBack`，含变更追踪）
- [x] 内容首尾空行保留

### 编辑器 UI
- [x] 左侧 CodeMirror 6 Markdown 编辑器（含滚动条样式）
- [x] 右侧条目卡片列表，左侧颜色条按 role 着色（hover 展宽为拖拽手柄）
- [x] 拖拽排序（HTML5 原生 drag-and-drop，down 方向 drop 位置已修正）
- [x] 左右双向实时同步（sync guard 防循环）
- [x] EntryCard：position 下拉（相对/聊天中），depth/order 仅 position=1 时显示
- [x] Marker 条目：enable/disable 开关；chatHistory/dialogueExamples 外的 marker 支持 role/position/depth 设置；名称可编辑
- [x] EntryCard header 布局：非 marker 为 `[title] [删除按钮] [开关]`，marker 为 `[title] [MARKER badge] [开关]`，开关始终最右
- [x] EntryCard：删除按钮（非 marker 专有，点击后展开内联二次确认行，需再次确认才删除）
- [x] EntryList：＋ 新增条目按钮（生成带随机 UUID 的默认条目，追加到列表末尾）
- [x] EntryList：缺失标准 marker 实时提示横幅（基于 `REQUIRED_MARKERS` 计算，含「自动补全」按钮）

### 文件操作
- [x] ➕ 新建（基于默认模板，含标准 markers，始终可见）
- [x] 📂 加载 JSON（始终可见）
- [x] 📥 导入 MD（始终可见；无 JSON 时自动 createNew 后再弹窗）
- [x] 📥 导入 JSON（加载后可见，两步：条目合并 + 采样参数对比）
- [x] ⚙️ 采样参数编辑（加载后可见，独立弹窗，直接编辑当前值）
- [x] 📤 导出 MD / 💾 导出 JSON（含 SaveDialog 命名弹窗）
- [x] 导出 JSON 时校验标准 marker 是否完整，缺失时弹窗提示（三选项：继续导出 / 取消 / 取消并自动补全）

### 导入合并（ChangePreview）
- [x] 全量合并列表（unchanged/modified/added/removed 四类）
- [x] 每类决策控件（修改：保留当前/使用新版；新增：勾选是否纳入；删除：删除/保留）
- [x] 展开查看变更详情（元数据 diff + 内容摘要）
- [x] 拖拽调整合并后顺序
- [x] `order: null` 和 `order: 100` 视为等价，不产生假变更

### 采样参数对比（ImportJsonDialog Step 2）
- [x] 12 个参数对比（temperature、top_p、top_k、top_a、min_p、frequency_penalty、presence_penalty、repetition_penalty、openai_max_context、openai_max_tokens、seed、reasoning_effort）
- [x] 4 列对齐（参数名 / 当前值 / 导入值 / 决策）

---

## 待办 / 规划

- [ ] 后端文件服务版本（Express，读写本地目录，与纯前端版本兼容共存）
- [ ] 输出预览面板
- [ ] JSON 与 JSON 之间的合并（已设计，复用 ChangePreview，P3）

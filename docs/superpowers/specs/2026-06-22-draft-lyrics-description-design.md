# 自動建草稿：從 YouTube 描述帶入歌詞到簡介 — 設計文件

日期：2026-06-22
範圍：「YouTube 排程自動建草稿」的小增強。建草稿時，把 YouTube 影片描述中的**歌詞段落**自動帶進 cover 的 `description`（心得/簡介）欄；去掉開頭的標題行與結尾的 hashtag 行。

## 背景與問題

目前 `syncYouTubeDrafts` 建草稿時 `description` 留空。但使用者的 YouTube 影片描述其實有結構固定的內容，扣掉標題行與 hashtag，中間就是幾句歌詞，可自動帶入省去手打。

實測使用者頻道 7 支（保留的完整版）描述結構：

```
[0] 標題行    〈歌名〉- 歌手  或  歌名 - 歌手     ← 但非每支都有（「梅雨季」第 0 行直接是歌詞）
[1..] 歌詞                                      ← 要保留
[末] 空行 + 「#tag #tag …」整行 hashtag         ← 要去掉
```

## 需求

1. 建草稿時，`description` 帶入「只剩歌詞」的內容。
2. 去掉結尾的空行與整行 hashtag。
3. 去掉開頭的標題行——但**只在它確實是標題時**（避免誤砍像「梅雨季」那種第一行就是歌詞的情況）。
4. 解析不出歌詞（空）時 `description` 留 null，不寫空字串。
5. 只影響**之後新建**的草稿；已建草稿不回填（去重會跳過）。Shorts 已被過濾且無描述，不受影響。

## 方案（已選定）

### 資料層 `lib/youtube/rss.ts`

- `FeedEntry` 加欄位 `description: string`（無 `<media:description>` 時為 `''`）。
- `parseChannelFeed` 每個 entry 多抓 `<media:description>([\s\S]*?)</media:description>`，經 `decodeXml`（已支援 `&#10;` 換行）後存入。

### 純函式 `extractLyrics(description, videoTitle): string`

```
lines = description（去 \r）.split('\n')
1. 從尾端往回砍：空行 或「整行都是 #hashtag 的行」
2. 若第 0 行 looksLikeTitle(line0, videoTitle) → 砍掉該行
3. 砍掉開頭殘留的空行
回傳 lines.join('\n').trim()
```

- `isHashtagLine(line)`：trim 後非空，且以空白切出的每個 token 都以 `#` 開頭（混了非 hashtag 文字的行不算，例如「副歌 #翻唱」會保留）。
- `looksLikeTitle(line0, title)`：
  - 第 0 行同時含 `〈` 與 `〉` → true（歌詞不會出現書名號，安全）。
  - 否則 `norm(title).startsWith(norm(line0))` 且 `norm(line0)` 非空 → true。
  - `norm(s)`：轉小寫 → 去掉 `〈〉()（）`、空白、破折號 `-－` → 去掉 `coverbyjun`。

驗證（7 支實測）：含〈〉的 5 支與吻合標題的「Last Summer」→ 砍標題行；「梅雨季」第 0 行為歌詞、不含〈〉也不吻合標題 → 保留。✓

### 接進 `lib/covers/sync-youtube.ts`

建草稿 insert 時：
```
description: extractLyrics(entry.description, entry.title) || null,
```

## 測試

- **單元（vitest）`extractLyrics`**：用 7 支真實描述當 fixtures，驗證
  - 含〈〉標題行被砍、Last Summer（無〈〉但吻合標題）被砍、梅雨季（第 0 行歌詞）保留。
  - 結尾 hashtag 行與其前的空行被砍。
  - 中段空行（seasons、梅雨季 [2] 空行在 hashtag 前）處理正確。
  - 邊界：純標題+hashtag（無歌詞）→ 回空字串。
- **`parseChannelFeed`**：餵含 `<media:description>` 的假 XML，驗證 description 被取出並解碼換行；現有測試 fixture 補上 `description` 欄位。
- 現有測試需維持通過。

## 範圍外（YAGNI）

- ❌ 不回填既有草稿/已發布的描述。
- ❌ 不自動去重複的空白行、不做歌詞格式美化（原樣保留中段）。
- ❌ 不處理描述中夾雜連結等其他內容（目前資料沒有；真出現時當歌詞保留，使用者可手動修）。

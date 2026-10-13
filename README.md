# 小型車筆試練習

給朋友使用的台灣普通小型車駕照筆試練習網站。純靜態網站：不需登入、後端或資料庫，進度存在各自瀏覽器的 localStorage。

React + TypeScript + Vite + Tailwind CSS。題庫來自交通部公路局「汽車筆試題庫」（PDF 頁首標示 115.5.29），共 1090 題、206 張圖。

## 功能
- 隨機模擬考（題數、及格分數可調；交卷後逐題檢討；重新整理可續考）
- 分類練習（PDF 的 10 個分類 × 全部／沒做過／答錯過）
- 數字題特訓（罰鍰／速度／距離／時間／其他，數字與關鍵字高亮，作答後顯示記憶提示）
- 口訣與比較（每個數字都對應題庫題號，並由測試核對）
- 錯題本（答錯自動收錄，連續答對 2 次移出；可看每題答題紀錄、重練）
- 測驗歷史、學習儀表板、JSON 備份／匯入（合併或覆蓋）

## 開發
```bash
npm install
npm run dev      # 開發伺服器
npm test         # 單元與流程測試
npm run build    # 型別檢查 + 建置到 dist/
```

## 部署
`dist/` 是純靜態檔，使用 HashRouter 與相對路徑（`base: './'`），放在任何子路徑都能用。**不能直接雙擊 index.html 開啟**（瀏覽器會擋 file:// 的模組載入），本機預覽請用 `npm run preview`。子路徑網址請帶結尾斜線（`/repo/`）。

- **Netlify／Cloudflare Pages**：連 repo，build command `npm run build`，publish directory `dist`。或把 `dist` 資料夾直接拖進 Netlify Drop。
- **GitHub Pages**：把 `dist` 內容推到 `gh-pages` 分支（或用 Actions 上傳 `dist`），網址如 `https://帳號.github.io/repo/`。
- 手機瀏覽：把網址傳給朋友即可，可「加入主畫面」。

## 資料與備份
資料只存在使用者自己的瀏覽器（key：`driving-quiz:v1`）。換手機、清除瀏覽資料、無痕模式都會遺失，請到「紀錄 → 備份／匯入」匯出 JSON。同一網址下不同裝置不會同步。

## 題庫更新
```bash
python3 -m venv .venv && .venv/bin/pip install pymupdf
.venv/bin/python scripts/extract_questions.py source/bank.pdf
npm test   # 驗證題數、分類、答案、圖片
```
腳本只做機械式擷取，不補寫任何內容。驗證結果與待人工確認項目見 [reports/import-report.md](reports/import-report.md)。

## 部署前的驗證紀錄
- 題庫：8 位校對員逐頁比對 PDF 頁面圖與 JSON（1090 題）；另以程式確認每段題幹／選項文字都能在 PDF 文字層逐字找到。已修正：27 處表頭殘留字、Q233 圖片順序、Q995 簡體字。
- 程式：壞備份檔、設定為 0、草稿含失效題號等情況已加驗證與測試。

## 已知限制
- 題庫 PDF 只有答案，沒有解析；App 不自行編造解析。
- 題庫本身有數字不一致處（例如酒測標準，詳見口訣頁「題庫疑點」），答案完全照 PDF，未對照現行法規。
- 模擬考題數（預設 50）非官方規定；及格預設 85 分取自題庫第 298 題。
- 「數字題」分類是依關鍵字自動判斷，不是官方分類。

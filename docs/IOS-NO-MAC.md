# 沒有 Mac：雲端建置與驗證

使用者目前沒有 Mac，第一步改採 GitHub Actions 的標準 macOS runner。這不是把 Windows 偽裝成 iOS；工作流程會在雲端 Mac 上以 Xcode 編譯，啟動 iPhone 模擬器並執行 App 內的原生相容性檢查。

目前狀態：**工作流程與專案已準備，尚未連接 GitHub、建立遠端程式庫或執行雲端工作；也尚未簽署或上傳 TestFlight。**

## 需要提供的配合

先安裝 GitHub 外掛並連接自己的 GitHub 帳號。若選擇由助手處理，連接確認後可建立獨立的 iOS 程式庫，沿用 GPL 原始碼公開方向。只推送程式、字型、依賴版本與公開校正圖；不會放入使用者工程 DWG／DXF、私有驗收截圖、憑證或密碼。

GitHub 標準 hosted runner 在公開程式庫可免費使用；私人程式庫則使用帳號額度，可能計費。這裡的工作有 20 分鐘上限，報告只保留三天。使用任何付費資源前需先確認帳號額度及使用者接受的費用。

## 工作流程做什麼

程式庫的 Actions → `iOS source and simulator build` → Run workflow：

1. 安裝鎖定的依賴，執行 15 項程式測試。
2. 用共用 WASM 核心讀取公開校正 DWG／DXF，核對座標及 120 m 距離。
3. 建立專用 `ios-ci` App，使用 Xcode 編譯模擬器版本。
4. 啟動可用 iPhone 模擬器並安裝／執行該版本。
5. 在真正 WKWebView 內測試 WASM Module Worker、標準 DWG、DXF File API、Canvas2D、向量 PDF、原生檔案分段寫入／讀回（逐位元組比對）及剪貼簿精度。
6. 匯出 JSON 結果、校正 PDF、模擬器截圖與日誌；任一檢查失敗，工作會標紅，不能當作通過。

公開校正圖是程式自建的 11 個圖元，由 AutoCAD 2027 存成 AC1032 DWG／DXF；沒有使用工程圖。它只驗證引擎相容性，不能代替大型工程圖或實機驗收。

這個流程不會自動打開分享選單或把資料寄給任何人。它會檢查 Share 插件存在，但真正分享、iOS「檔案」選擇器、飛航模式、舊機型記憶體及真實工程圖仍需要 iPhone 測試。

## 下一步才是 TestFlight

雲端測試版本會自動跑檢查，不用於 TestFlight。一般 App 的 `pnpm ios:sync` 不包含自動檢查入口；封裝腳本也拒絕把 CI 版本當成一般 App 交付。

第一輪雲端編譯／相容性通過後，才能接續簽署與 TestFlight。需要 Apple Developer Program 會員、App Store Connect 的 App 記錄、唯一 Bundle ID，以及合法的簽署憑證／Provisioning Profile 或相應自動簽署授權。這些機密應只放在使用者控制的安全 Secrets，不應貼到聊天、原始碼或 ZIP。

使用者不需先購買 Mac；Apple 帳號／簽署與最終測試仍需配合。現有 GPL 引擎的 Apple 通路發佈條款也仍需在上傳前確認。沒有完成簽署與上傳前，不會有 TestFlight 安裝連結。

現行 [TestFlight 用戶端](https://apps.apple.com/us/app/testflight/id899247664) 要求 iOS 16.0 以上；本輪測試者須符合此條件。

## 官方依據

- [GitHub Actions 計費與公開程式庫](https://docs.github.com/en/actions/concepts/billing-and-usage)
- [GitHub macOS runner](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
- [Apple 開發者計畫與 TestFlight](https://developer.apple.com/help/account/membership/programs-overview)

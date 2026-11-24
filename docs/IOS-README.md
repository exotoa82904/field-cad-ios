# 現場 CAD iOS 0.3.0

這是從網站 0.2.1 接續的 Capacitor 8.6.2 / WKWebView 專案。網頁核心、WCS、量測、DXF 與向量 PDF 共用。現有公開網站未在這次工作中更新。

目前交付：Xcode 專案、離線網頁資源、手機介面、官方檔案／分享／剪貼簿插件、相容性檢查頁、建置與驗收步驟。**本環境為 Windows；未執行 Xcode 編譯、iOS 模擬器或 iPhone 實機，未產生已簽署 IPA，未上傳 TestFlight。** 目前不能把第一里程碑標記為 iOS 實機通過。

使用者目前沒有 Mac，後續採 [雲端 Mac 建置方案](IOS-NO-MAC.md)。專案附帶 GitHub Actions 的編譯與 WKWebView 相容性檢查工作流程；目前尚未連接 GitHub 或執行該工作。

## 首次在 Mac 建置

需要 macOS、Xcode 26 或更新版本、Xcode Command Line Tools、Node.js 22+、pnpm 11.25.0、Python 3。iOS 部署目標暫定 15.0，以擴大相容性；這是建置下限，不是所有舊機型或 DWG 大小的實測保證。使用者未指定確切機型，需依驗收結果決定最終支援範圍。

目前 Apple 的 [TestFlight 用戶端](https://apps.apple.com/us/app/testflight/id899247664) 要求 iOS 16.0 以上。因此這輪透過 TestFlight 的測試者須滿足 iOS 16 以上；保留 iOS 15 建置下限不等於承諾能在 iOS 15 使用現行 TestFlight。

在解壓後的 `FieldCAD` 目錄執行：

```sh
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
pnpm test
pnpm ios:sync
pnpm ios:open
```

或直接在 Xcode 開啟 `ios/App/App.xcodeproj`。本專案採 Swift Package Manager，沒有需要開啟的 CocoaPods workspace。第一次安裝 npm／Swift 相依套件及下載模擬器需要連網；**安裝後 App 執行不依賴網路**。`capacitor.config.json` 沒有 `server.url` 或遠端更新入口，解析引擎、字型、PDF 程式與 GPL 原始碼都隨 App 資源打包。

`ios:sync` 會重新建置 Safari 15 目標的網頁程式，封裝字型及 DWG WASM，再同步到原生專案。若修改 Bundle ID，請一起修改 `capacitor.config.json` 的 `appId` 與 Xcode 的 Bundle Identifier。`org.fieldcad.offline` 為交付用預設識別碼，尚未在 Apple 帳號註冊。

## 模擬器與 TestFlight

不需 Apple 帳號即可先在 Xcode 選 iPhone 模擬器執行；可先用 `sh scripts/ios-simulator-build.sh` 做無簽署的原生編譯。選「較小螢幕 + 最舊可取得的支援 iOS」及「目前常用機型」各測一組；模擬器結果不能代替實機記憶體、飛航模式、Files 或分享驗證。

使用者已選 TestFlight 多人測試。後續需要：

1. 可使用的 Mac／Xcode，或由使用者核准的 Mac CI。
2. Apple Developer Program 的 Team 與 App Store Connect 權限；在 Xcode 自行登入，不需把 Apple 密碼交給此專案。
3. 設定唯一 Bundle ID、Signing Team、Build Number，在 App Store Connect 建立 App 記錄。
4. 先跑本文相容性閘門與 `IOS-ACCEPTANCE.md`，確認 GPL 發佈條款後，再在 Xcode Archive / Organizer 選 App Store Connect 上傳。外部測試可能需 Apple Beta App Review。

```sh
export IOS_TEAM_ID=你的TeamID
sh scripts/ios-archive.sh
```

此腳本僅建立 archive，不會上傳、接受條款或邀請測試者。目前沒有可交付的 TestFlight 安裝連結。

## 先驗證，再定案

App 的「更多 → 裝置檢查」會在實際執行環境中檢查：WASM + Module Worker、校正 DXF 的原始座標及 120 單位距離、PDF 字型與向量輸出。可另外選真實 DWG／DXF，記錄版本、大小、圖元數、解析階段時間。報告清楚區分瀏覽器和 iOS WKWebView，需填實機／模擬器與型號，不會自動假稱實機通過。報告不會上傳；使用者可以自行存檔或分享。

原生整合目前採用最小候選方案：輸入用 WKWebView 的檔案選擇器；輸出用官方 Filesystem + Share；複製座標用 Clipboard。這些 iOS 路徑尚未實測，需依閘門結果決定是否改為原生 UIDocumentPicker 或調整引擎。若舊系統出現 Worker、WebAssembly 或 CSP 相容性問題，先保留記錄，再比較提高最低系統、替代引擎或其他處理方式；不自動上傳工程圖轉檔。

## 手機操作

- 開圖後以平移模式開始，保留桌面版原有滑鼠操作。雙指隨時平移／縮放；雙指結束不會產生量測點或窗選。
- 查座標、距離、面積、移動基準／目標和標註時，單指拖曳準星。準星在手指上方，左上局部放大鏡顯示鎖點；按「確認此點」才提交，放開手指不會提交。
- 底部主列：平移、選取、座標、距離、面積、更多。更多展開移動、旋轉、文字、箭頭、尺寸及 DXF／刪除／檢查入口。
- 選取模式明確選「全包」或「相交」，不依賴手指拖曳方向；桌面仍採左往右全包、右往左相交。可加選、看數量、定位選取。
- 移動可先啟動命令再選物件，接著確認基準點、目標點；整批一次復原。也可先選再啟動。按「參數」輸入 ΔX／ΔY。
- 面積以「完成面積」結束，「撤回點」刪除上一步；「取消」結束目前命令。
- PDF 單指框定橘色出圖範圍，進入預覽後確認紙張、可見圖層及標註；分享選單可選「儲存到檔案」。關閉預覽不殘留框線。DXF 也使用同一分享流程。
- 檔案與資料處理全在裝置內；iCloud 等提供者尚未下載的檔案，飛航模式下可能無法取得，需先下載到本機。

第一版未加入從其他 App 分享進來的 Share Extension／Open In 處理，避免安全範圍 URL 與冷啟動匯入尚未驗證就宣稱可用。先從「檔案」選圖；分享匯入可作第二里程碑。PDF／DXF 分享輸出則已實作候選路徑。

## 限制與發佈注意

圖面目前在記憶體中；App 被系統終止時未另存修改會遺失。請先另存 DXF，再切換大型工作。自動草稿復原適合下一版加入。大型 DWG 的轉換資料與記憶體使用遠大於 DWG 大小，9.52 MiB 案例仍需在舊 iPhone 實測，不承諾所有機型都能載入。

沿用網站限制：2D 模型空間、ASCII DXF、XY 距離／面積；HATCH、SPLINE、外部參照、專用物件、原始字型與線型未完整支援。沒有 DWG 回存；固定 PDF 出圖比例未加入。

專案與 LibreDWG 引擎採 GPL-3.0。完整網站／iOS 原始碼與引擎來源隨包提供，可從 App 圖層面板底部匯出。**接受網站 GPL 開源不等於已確認 TestFlight 發佈條款相容性**；原生程式連結、安裝資訊及 Apple 通路的條款需在實際上傳前確認。此專案未宣稱已完成該法律或 Apple 審核。

## 官方資料

- [Capacitor iOS 支援及 Xcode 要求](https://capacitorjs.com/docs/ios)
- [建置環境與 SPM](https://capacitorjs.com/docs/getting-started/environment-setup)
- [官方檔案與隱私宣告](https://capacitorjs.com/docs/apis/filesystem)
- [原生分享](https://capacitorjs.com/docs/apis/share)
- [Apple TestFlight](https://developer.apple.com/testflight/)
- [Apple App Store Connect](https://developer.apple.com/app-store-connect/)
- [WebKit Safari 15 Worker／WASM 支援](https://webkit.org/blog/11989/new-webkit-features-in-safari-15/)
- [GNU GPL FAQ](https://www.gnu.org/licenses/gpl-faq.html)

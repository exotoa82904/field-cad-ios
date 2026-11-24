# 現場 CAD / Field CAD

以網址開啟的本機 CAD 工具。程式不提供圖檔上傳端點，開檔使用 File API，DWG 由 Web Worker / WebAssembly 解析，圖面只保存在瀏覽器記憶體。重新整理前請另存 DXF。

iOS 0.3.0 專案與離線封裝位於 `ios/`，操作、Mac 建置及 TestFlight 前置條件見 [iOS 說明](docs/IOS-README.md)，已測／待測項目見 [iOS 驗收紀錄](docs/IOS-ACCEPTANCE.md)。已由雲端 Mac 通過 Xcode 模擬器編譯及八項 WKWebView／原生相容性檢查；尚未做 iPhone 實機驗收或上傳 TestFlight。執行 `pnpm ios:sync` 可重建完整離線 App 資源；`pnpm ios:package` 產生可交接的專案 ZIP。

沒有 Mac 時可沿用已執行的 [GitHub 雲端 Mac 方案](docs/IOS-NO-MAC.md)。[成功工作與日誌](https://github.com/exotoa82904/field-cad-ios/actions/runs/45338630377)、[核對報告](docs/IOS-CLOUD-RESULT.json)使用公開校正圖，不含工程圖。

## 啟動與建置

需要 Node.js 22+、pnpm 11.25.0 與 Python 3（建立原始碼與 iOS 資源封裝）。

```
pnpm install --no-frozen-lockfile
pnpm dev
pnpm test
pnpm build
```

部署 `dist/`，不需要圖檔伺服器或資料庫。請使用 HTTPS 或 localhost；Web Worker / WebAssembly 不支援直接雙擊 HTML 的 file:// 模式。

## 操作

- O 開圖，H 平移，V 選取，C 座標，M 距離，A 面積，G 移動，R 旋轉，F 全圖。
- 開圖自動進入選取並定位可見主圖。極遠零散幾何只影響視角，不會刪除；「全圖」或 F 查看全部，PDF 全圖仍包含全部可見物件。
- 空白鍵或中鍵暫時平移；滾輪以游標位置縮放；中鍵連按兩下定位主圖，Home 放大至選取物件。
- 左往右窗選完整包含；右往左窗選包含相交。Shift 加選；選取後顯示數量。
- 移動支援先啟動命令再點選／窗選物件，選取後直接指定基準點、目標點；也可先選再啟動。指定基準點前按 Shift 可加選。移動可用基準點／目標點或 ΔX／ΔY。旋轉可用中心與角度，或中心、參考方向與目標方向。逆時針為正。
- Ctrl+Z 復原，Ctrl+Y／Ctrl+Shift+Z 重做；整批移動、旋轉、刪除及新增標註各為一個操作。
- Delete／Backspace 或「刪除選取」刪除文字、尺寸及其他可編輯圖元；左側標註清單可定位與刪除新增標註，刪除可復原並反映於另存 DXF。圖塊刪除以整個參照為單位。
- 面積逐點點選，以 Enter 閉合，Backspace 撤回上一點。
- 座標是原圖 WCS X/Y，複製使用原始精度。圖面單位的設定不縮放原始數值。
- PDF 框線只在拖曳框定時顯示，關閉預覽後不留在圖面，出圖範圍仍會記住；切換工具或 Esc 會取消尚未完成的框選。PDF 框定使用獨立橘色模式，輸出 A4/A3、橫式／直式、白底與適合頁面，含可見圖層及範圍內標註。

## 開圖效能

0.2.0 預熱並重用 WASM Worker，DWG 改讀最小圖層中繼資料，DXF 修復改串流掃描，避免複製完整原始圖元到主執行緒。PDF 引擎延後到匯出時載入。首次開啟仍需下載約 8 MB WASM；DWG 須本機轉 DXF，通常比直接開 DXF 慢。記憶體需求仍明顯高於原 DWG 檔案大小。標題顯示實際開圖時間，不能視為所有電腦的保證。

## 引擎能力與限制

DWG：LibreDWG Web 0.9.3，以 WASM 在本機讀取並轉為 DXF 編輯資料。補回原始 DWG 圖層參照，以及部分旋轉尺寸缺漏的 Z 座標／無效零角度欄位。特殊物件交換副本不保證無損。

DXF：dxf-parser 1.1.2 讀取 ASCII DXF（UTF-8／Big5）；另存以原始 DXF 群組資料為基礎，修改選取圖元的位置、旋轉，加入原生 DIMENSION、TEXT 及箭頭幾何。沒有 DWG 回存功能。

顯示：2D 模型空間俯視，LINE、POLYLINE、LWPOLYLINE（含 bulge）、ARC、CIRCLE、ELLIPSE、POINT、TEXT、MTEXT、SOLID、3DFACE，以及巢狀 INSERT 與 DIMENSION 圖塊。曲線顯示以向量折線近似，鎖點端點／中點／圓心採解析幾何。量測採 XY 平面，面積採點選頂點間的直線邊界。

未完整支援：紙張配置、傾斜 OCS、SPLINE、HATCH 填充、網格、外部參照檔、影像、代理及專用 CAD 物件。未顯示的 DXF 資料保留於交換副本，但 DWG 轉檔本身不保證專用物件完整。圖面資訊列出已知未顯示物件。

文字使用 Noto Sans TC 替代 SHX／原始字型，寬度、對齊及 MTEXT 排版可能與桌面 CAD 不同；線型、線寬及顏色繼承也未完全重現。

PDF：pdf-lib 1.17.1 與 fontkit 1.1.1，線條及文字皆為向量，不含整頁點陣圖。曲線採向量折線近似。完整嵌入靜態 Noto Sans TC 字型以維持字形，單份 PDF 約增加 4.3 MB。不提供固定出圖比例。預覽與輸出採相同圖元、圖層、裁切範圍及紙張轉換；替代字型的排版限制同樣適用。

## 授權與對應原始碼

本程式依 GPL-3.0 發佈，見 LICENSE。`/source.zip` 提供完整網站原始碼與依賴鎖定檔，`/libredwg-corresponding-source.zip` 提供所用 DWG 引擎的對應原始碼。兩者均不包含使用者圖檔或本機驗證資料。

LibreDWG Web v0.9.3，來源標籤 commit：`c8d0bc8f4c0dfac6fcde9f8347867ed1c35ffad0`。來源封裝保留建置所需程式及腳本，略去示範圖檔、文件圖片及已編譯二進位。已核對 `.inputs-sha256` 與 npm WASM 套件一致。上游建置步驟見封裝中 `bindings/javascript/README.md`，採 Emscripten 編譯。

Noto Sans TC 來自 Google Fonts，已由變動字型產生 wght=400 的靜態字型，OFL 授權見 `public/fonts/OFL.txt`。

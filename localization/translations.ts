
export type Language = 'en' | 'zh' | 'zh-TW';

export const translations: { [key: string]: { [lang in Language]: string } } = {
  // App.tsx
  appName: { en: 'PIXEL TRAVEL MAP', zh: '像素旅行地图', 'zh-TW': '像素旅行地圖' },
  addMemory: { en: 'Add Memory', zh: '添加回忆', 'zh-TW': '新增回憶' },
  reset: { en: 'Reset', zh: '重置', 'zh-TW': '重設' },
  resetMap: { en: 'Reset map', zh: '重置地图', 'zh-TW': '重設地圖' },
  showHelp: { en: 'Show help', zh: '显示帮助', 'zh-TW': '顯示說明' },
  toggleLanguage: { en: 'Toggle language', zh: '切换语言', 'zh-TW': '切換語言' },
  welcomeTitle: { en: 'Pixel Travel Map', zh: '像素旅行地图', 'zh-TW': '像素旅行地圖' },
  welcomeSubtitle: { en: 'Upload travel photos to create a 3D map of your adventures.', zh: '上传旅行照片，创建你冒险的3D地图。', 'zh-TW': '上傳旅行照片，建立你冒險的3D地圖。' },
  welcomeInstructions: { en: 'Drag & drop, paste, or use the upload button.', zh: '拖放、粘贴或使用上传按钮。', 'zh-TW': '拖放、貼上或使用上傳按鈕。' },
  toastLocationFound: { en: 'Location found! Placing your memory in', zh: '已找到位置！正在放置您的回忆于', 'zh-TW': '已找到位置！正在放置您的回憶於' },
  toastNoLocationFound: { en: 'No location found. Placing memory at drop point.', zh: '未找到位置。在拖放点放置回忆。', 'zh-TW': '未找到位置。在拖放點放置回憶。' },
  placementPrompt: { en: 'No location data found. Click anywhere on the map to place your model.', zh: '未找到位置数据。请在地图上点击任意位置以放置您的模型。', 'zh-TW': '未找到位置資料。請在地圖上點擊任意位置以放置您的模型。' },
  selectedLocation: { en: 'Selected location', zh: '选定的位置', 'zh-TW': '選定的位置' },
  droppedLocation: { en: 'Dropped Location', zh: '拖放的位置', 'zh-TW': '拖放的位置' },
  loadingLocation: { en: 'Loading location...', zh: '加载位置中...', 'zh-TW': '載入位置中...' },
  importMap: { en: 'Import', zh: '导入', 'zh-TW': '匯入' },
  exportMap: { en: 'Export', zh: '导出', 'zh-TW': '匯出' },
  loadingExport: { en: 'Preparing your map...', zh: '正在准备您的地图...', 'zh-TW': '正在準備您的地圖...' },
  loadingImport: { en: 'Importing your memories...', zh: '正在导入您的回忆...', 'zh-TW': '正在匯入您的回憶...' },
  errorInvalidFile: { en: 'Invalid map file. Please select a valid `.pixmap` file.', zh: '无效的地图文件。请选择一个有效的 `.pixmap` 文件。', 'zh-TW': '無效的地圖檔案。請選擇一個有效的 `.pixmap` 檔案。' },
  importSuccess: { en: 'Map imported successfully!', zh: '地图导入成功！', 'zh-TW': '地圖匯入成功！' },
  
  // ImportConfirmModal.tsx
  importConfirmTitle: { en: 'Replace current map?', zh: '替换当前地图吗？', 'zh-TW': '取代目前地圖嗎？' },
  importConfirmMessage: { en: 'This will replace your current map with the contents of the file. All unsaved changes will be lost.', zh: '这将用文件内容替换您当前的地图。所有未保存的更改都将丢失。', 'zh-TW': '這將用檔案內容取代您目前的地圖。所有未儲存的變更都將遺失。' },

  // SearchControl.tsx
  searchPlaceholder: { en: 'Search location...', zh: '搜索位置...', 'zh-TW': '搜尋位置...' },
  searchButton: { en: 'Search', zh: '搜索', 'zh-TW': '搜尋' },

  // HelpModal.tsx
  helpTitle: { en: 'Controls', zh: '操作说明', 'zh-TW': '操作說明' },
  helpDragMapKey: { en: 'Drag Map', zh: '拖动地图', 'zh-TW': '拖曳地圖' },
  helpDragMapValue: { en: 'Pan View', zh: '平移视图', 'zh-TW': '平移檢視' },
  helpMouseWheelKey: { en: 'Mouse Wheel', zh: '鼠标滚轮', 'zh-TW': '滑鼠滾輪' },
  helpMouseWheelValue: { en: 'Zoom View', zh: '缩放视图', 'zh-TW': '縮放檢視' },
  helpRegenerate: { en: 'Regenerate', zh: '重新生成', 'zh-TW': '重新產生' },
  helpFlip: { en: 'Flip', zh: '翻转', 'zh-TW': '翻轉' },
  helpDuplicate: { en: 'Duplicate', zh: '复制', 'zh-TW': '複製' },
  helpShowOriginal: { en: 'Show Original', zh: '显示原图', 'zh-TW': '顯示原圖' },
  helpScale: { en: 'Scale Object', zh: '缩放对象', 'zh-TW': '縮放物件' },
  helpDeleteKey: { en: 'Backspace', zh: '退格键', 'zh-TW': 'Backspace鍵' },
  helpDelete: { en: 'Delete', zh: '删除', 'zh-TW': '刪除' },
  helpArrowKeysKey: { en: 'Arrow keys', zh: '方向键', 'zh-TW': '方向鍵' },
  helpArrowKeysValue: { en: 'Move Object', zh: '移动对象', 'zh-TW': '移動物件' },
  helpFooter: { en: 'Built with Gemini 2.5 Flash', zh: '由 Gemini 2.5 Flash 构建', 'zh-TW': '由 Gemini 2.5 Flash 建構' },

  // ResetConfirmModal.tsx
  resetConfirmTitle: { en: 'Reset map?', zh: '重置地图？', 'zh-TW': '重設地圖？' },
  confirm: { en: 'Confirm', zh: '确认', 'zh-TW': '確認' },
  cancel: { en: 'Cancel', zh: '取消', 'zh-TW': '取消' },

  // Toolbar.tsx
  toolbarRegenerate: { en: 'Regenerate', zh: '重新生成', 'zh-TW': '重新產生' },
  toolbarFlip: { en: 'Flip', zh: '翻转', 'zh-TW': '翻轉' },
  toolbarDuplicate: { en: 'Duplicate', zh: '复制', 'zh-TW': '複製' },
  toolbarScaleUp: { en: 'Scale Up', zh: '放大', 'zh-TW': '放大' },
  toolbarScaleDown: { en: 'Scale Down', zh: '缩小', 'zh-TW': '縮小' },
  toolbarDelete: { en: 'Delete', zh: '删除', 'zh-TW': '刪除' },
  toolbarLock: { en: 'Lock Memory', zh: '锁定回忆', 'zh-TW': '鎖定回憶' },
  toolbarEditPlaceholder: { en: 'Edit with text...', zh: '输入文字编辑...', 'zh-TW': '輸入文字編輯...' },
  toolbarApplyEdit: { en: 'Apply edit', zh: '应用编辑', 'zh-TW': '套用編輯' },

  // MemoryCards.tsx
  cardsEditLog: { en: 'Edit Travel Log', zh: '编辑旅行日志', 'zh-TW': '編輯旅行日誌' },
  cardsViewPhoto: { en: 'View photo', zh: '查看照片', 'zh-TW': '檢視照片' },
  cardsPhotoThumbnailAlt: { en: 'Memory thumbnail', zh: '回忆缩略图', 'zh-TW': '回憶縮圖' },
  cardsDeletePhoto: { en: 'Delete photo', zh: '删除照片', 'zh-TW': '刪除照片' },
  cardsAddPhoto: { en: 'Add Photo', zh: '添加照片', 'zh-TW': '新增照片' },
  cardsUnlock: { en: 'Unlock to Edit', zh: '解锁以编辑', 'zh-TW': '解鎖以編輯' },

  // PhotoPreviewModal.tsx
  previewAltText: { en: 'Memory preview {{current}} of {{total}}', zh: '回忆预览 {{current}} / {{total}}', 'zh-TW': '回憶預覽 {{current}} / {{total}}' },
  previewClose: { en: 'Close photo preview', zh: '关闭照片预览', 'zh-TW': '關閉照片預覽' },
  previewPrevious: { en: 'Previous photo', zh: '上一张照片', 'zh-TW': '上一張照片' },
  previewNext: { en: 'Next photo', zh: '下一张照片', 'zh-TW': '下一張照片' },

  // TravelLogModal.tsx
  logTitle: { en: 'Travel Log', zh: '旅行日志', 'zh-TW': '旅行日誌' },
  logLocation: { en: 'Location', zh: '位置', 'zh-TW': '位置' },
  logDate: { en: 'Date', zh: '日期', 'zh-TW': '日期' },
  logMusings: { en: 'Musings', zh: '随笔', 'zh-TW': '隨筆' },
  logMusingsPlaceholder: { en: 'Your story...', zh: '你的故事...', 'zh-TW': '你的故事...' },
  save: { en: 'Save', zh: '保存', 'zh-TW': '儲存' },
  
  // Authentication
  signIn: { en: 'Sign In', zh: '登录', 'zh-TW': '登入' },
  signOut: { en: 'Sign Out', zh: '登出', 'zh-TW': '登出' },
  register: { en: 'Register', zh: '注册', 'zh-TW': '註冊' },
  createAccount: { en: 'Create Account', zh: '创建账户', 'zh-TW': '建立帳號' },
  username: { en: 'Username', zh: '用户名', 'zh-TW': '使用者名稱' },
  email: { en: 'Email', zh: '邮箱', 'zh-TW': '電子郵件' },
  displayName: { en: 'Display Name', zh: '显示名称', 'zh-TW': '顯示名稱' },
  authFailed: { en: 'Authentication failed', zh: '认证失败', 'zh-TW': '認證失敗' },
  processing: { en: 'Processing...', zh: '处理中...', 'zh-TW': '處理中...' },
  alreadyHaveAccount: { en: 'Already have an account? Sign In', zh: '已有账户？登录', 'zh-TW': '已有帳號？登入' },
  dontHaveAccount: { en: "Don't have an account? Register", zh: '没有账户？注册', 'zh-TW': '沒有帳號？註冊' },
  passkeyAuthInfo: { en: 'This app uses passkey authentication for secure, passwordless login.', zh: '此应用使用通行密钥认证，实现安全的无密码登录。', 'zh-TW': '此應用程式使用通行金鑰認證，實現安全的無密碼登入。' },
  optional: { en: 'optional', zh: '可选', 'zh-TW': '選填' },
  myMaps: { en: 'My Maps', zh: '我的地图', 'zh-TW': '我的地圖' },
  newMap: { en: 'New Map', zh: '新地图', 'zh-TW': '新地圖' },
  publicMap: { en: 'Public', zh: '公开', 'zh-TW': '公開' },
  privateMap: { en: 'Private', zh: '私密', 'zh-TW': '私密' },
  loading: { en: 'Loading...', zh: '加载中...', 'zh-TW': '載入中...' },
};

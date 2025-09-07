
export type Language = 'en' | 'zh';

export const translations: { [key: string]: { [lang in Language]: string } } = {
  // App.tsx
  appName: { en: 'PIXEL TRAVEL MAP', zh: '像素旅行地图' },
  addMemory: { en: 'Add Memory', zh: '添加回忆' },
  reset: { en: 'Reset', zh: '重置' },
  resetMap: { en: 'Reset map', zh: '重置地图' },
  showHelp: { en: 'Show help', zh: '显示帮助' },
  toggleLanguage: { en: 'Toggle language', zh: '切换语言' },
  welcomeTitle: { en: 'Pixel Travel Map', zh: '像素旅行地图' },
  welcomeSubtitle: { en: 'Upload travel photos to create a 3D map of your adventures.', zh: '上传旅行照片，创建你冒险的3D地图。' },
  welcomeInstructions: { en: 'Drag & drop, paste, or use the upload button.', zh: '拖放、粘贴或使用上传按钮。' },
  toastLocationFound: { en: 'Location found! Placing your memory in', zh: '已找到位置！正在放置您的回忆于' },
  toastNoLocationFound: { en: 'No location found. Placing memory at drop point.', zh: '未找到位置。在拖放点放置回忆。' },
  placementPrompt: { en: 'No location data found. Click anywhere on the map to place your model.', zh: '未找到位置数据。请在地图上点击任意位置以放置您的模型。' },
  selectedLocation: { en: 'Selected location', zh: '选定的位置' },
  droppedLocation: { en: 'Dropped Location', zh: '拖放的位置' },
  loadingLocation: { en: 'Loading location...', zh: '加载位置中...' },
  importMap: { en: 'Import', zh: '导入' },
  exportMap: { en: 'Export', zh: '导出' },
  loadingExport: { en: 'Preparing your map...', zh: '正在准备您的地图...' },
  loadingImport: { en: 'Importing your memories...', zh: '正在导入您的回忆...' },
  errorInvalidFile: { en: 'Invalid map file. Please select a valid `.pixmap` file.', zh: '无效的地图文件。请选择一个有效的 `.pixmap` 文件。' },
  importSuccess: { en: 'Map imported successfully!', zh: '地图导入成功！' },
  
  // ImportConfirmModal.tsx
  importConfirmTitle: { en: 'Replace current map?', zh: '替换当前地图吗？' },
  importConfirmMessage: { en: 'This will replace your current map with the contents of the file. All unsaved changes will be lost.', zh: '这将用文件内容替换您当前的地图。所有未保存的更改都将丢失。' },

  // SearchControl.tsx
  searchPlaceholder: { en: 'Search location...', zh: '搜索位置...' },
  searchButton: { en: 'Search', zh: '搜索' },

  // HelpModal.tsx
  helpTitle: { en: 'Controls', zh: '操作说明' },
  helpDragMapKey: { en: 'Drag Map', zh: '拖动地图' },
  helpDragMapValue: { en: 'Pan View', zh: '平移视图' },
  helpMouseWheelKey: { en: 'Mouse Wheel', zh: '鼠标滚轮' },
  helpMouseWheelValue: { en: 'Zoom View', zh: '缩放视图' },
  helpRegenerate: { en: 'Regenerate', zh: '重新生成' },
  helpFlip: { en: 'Flip', zh: '翻转' },
  helpDuplicate: { en: 'Duplicate', zh: '复制' },
  helpShowOriginal: { en: 'Show Original', zh: '显示原图' },
  helpScale: { en: 'Scale Object', zh: '缩放对象' },
  helpDeleteKey: { en: 'Backspace', zh: '退格键' },
  helpDelete: { en: 'Delete', zh: '删除' },
  helpArrowKeysKey: { en: 'Arrow keys', zh: '方向键' },
  helpArrowKeysValue: { en: 'Move Object', zh: '移动对象' },
  helpFooter: { en: 'Built with Gemini 2.5 Flash', zh: '由 Gemini 2.5 Flash 构建' },

  // ResetConfirmModal.tsx
  resetConfirmTitle: { en: 'Reset map?', zh: '重置地图？' },
  confirm: { en: 'Confirm', zh: '确认' },
  cancel: { en: 'Cancel', zh: '取消' },

  // Toolbar.tsx
  toolbarRegenerate: { en: 'Regenerate', zh: '重新生成' },
  toolbarFlip: { en: 'Flip', zh: '翻转' },
  toolbarDuplicate: { en: 'Duplicate', zh: '复制' },
  toolbarScaleUp: { en: 'Scale Up', zh: '放大' },
  toolbarScaleDown: { en: 'Scale Down', zh: '缩小' },
  toolbarDelete: { en: 'Delete', zh: '删除' },
  toolbarLock: { en: 'Lock Memory', zh: '锁定回忆' },
  toolbarEditPlaceholder: { en: 'Edit with text...', zh: '输入文字编辑...' },
  toolbarApplyEdit: { en: 'Apply edit', zh: '应用编辑' },

  // MemoryCards.tsx
  cardsEditLog: { en: 'Edit Travel Log', zh: '编辑旅行日志' },
  cardsViewPhoto: { en: 'View photo', zh: '查看照片' },
  cardsPhotoThumbnailAlt: { en: 'Memory thumbnail', zh: '回忆缩略图' },
  cardsDeletePhoto: { en: 'Delete photo', zh: '删除照片' },
  cardsAddPhoto: { en: 'Add Photo', zh: '添加照片' },
  cardsUnlock: { en: 'Unlock to Edit', zh: '解锁以编辑' },

  // PhotoPreviewModal.tsx
  previewAltText: { en: 'Memory preview {{current}} of {{total}}', zh: '回忆预览 {{current}} / {{total}}' },
  previewClose: { en: 'Close photo preview', zh: '关闭照片预览' },
  previewPrevious: { en: 'Previous photo', zh: '上一张照片' },
  previewNext: { en: 'Next photo', zh: '下一张照片' },

  // TravelLogModal.tsx
  logTitle: { en: 'Travel Log', zh: '旅行日志' },
  logLocation: { en: 'Location', zh: '位置' },
  logDate: { en: 'Date', zh: '日期' },
  logMusings: { en: 'Musings', zh: '随笔' },
  logMusingsPlaceholder: { en: 'Your story...', zh: '你的故事...' },
  save: { en: 'Save', zh: '保存' },
};

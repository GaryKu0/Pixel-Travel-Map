import { ProcessedImage, PhotoData } from '../App';

// Convert File to base64 string
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

// Convert base64 to Blob
export function base64ToBlob(base64: string): Blob {
  const parts = base64.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(parts[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

// Convert HTMLImageElement to base64
export async function imageToBase64(img: HTMLImageElement): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
}

// Convert ProcessedImage to API format
export async function processedImageToApi(image: ProcessedImage, mapId: number) {
  const processedImageBase64 = image.processedImage 
    ? await imageToBase64(image.processedImage)
    : null;
  
  const sourceData = image.sourceFile 
    ? await fileToBase64(image.sourceFile)
    : image.sourceText || null;
  
  const photos = await Promise.all(
    image.photos.map(async (photo) => ({
      data: await fileToBase64(photo.file),
      filename: photo.file.name
    }))
  );
  
  return {
    map_id: mapId,
    source_type: image.sourceFile ? 'file' : 'text',
    source_data: sourceData,
    processed_image: processedImageBase64,
    lat: image.lat,
    lng: image.lng,
    width: image.width,
    height: image.height,
    content_bounds: image.contentBounds,
    flipped_horizontally: image.flippedHorizontally || false,
    is_locked: image.isLocked || false,
    log_location: image.log.location || '',
    log_date: image.log.date || '',
    log_musings: image.log.musings || '',
    photos
  };
}

// Convert API response to ProcessedImage format
export async function apiToProcessedImage(data: any): Promise<ProcessedImage> {
  let processedImg: HTMLImageElement | null = null;
  
  if (data.processed_image) {
    processedImg = new Image();
    processedImg.src = data.processed_image;
    await new Promise((resolve) => {
      processedImg!.onload = resolve;
    });
  }
  
  const photos: PhotoData[] = data.photos?.map((photo: any) => {
    const blob = base64ToBlob(photo.photo_data);
    const file = new File([blob], photo.filename || 'photo.jpg', { type: blob.type });
    return {
      url: URL.createObjectURL(blob),
      file
    };
  }) || [];
  
  const contentBounds = typeof data.content_bounds === 'string' 
    ? JSON.parse(data.content_bounds)
    : data.content_bounds;
  
  return {
    id: data.id,
    sourceFile: undefined, // We don't restore the original file
    sourceText: data.source_type === 'text' ? data.source_data : undefined,
    processedImage: processedImg,
    showOriginal: false,
    lat: data.lat,
    lng: data.lng,
    width: data.width || 120,
    height: data.height || 120,
    isGenerating: false,
    contentBounds: contentBounds || { x: 0, y: 0, width: 120, height: 120 },
    flippedHorizontally: data.flipped_horizontally || false,
    isLocked: data.is_locked || false,
    photos,
    log: {
      location: data.log_location || '',
      date: data.log_date || '',
      musings: data.log_musings || ''
    }
  };
}
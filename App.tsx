
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as Tone from 'tone';
import { generateImageWithPrompt } from './services/geminiService';
import { ImageMarker } from './components/ImageMarker';
import { Toolbar } from './components/Toolbar';
import { HelpModal } from './components/HelpModal';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { ImportConfirmModal } from './components/ImportConfirmModal';
import { MemoryCards } from './components/MemoryCards';
import { PhotoPreviewModal } from './components/PhotoPreviewModal';
import { TravelLogModal } from './components/TravelLogModal';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';
import { useLocalization } from './context/LocalizationContext';
import { SearchControl } from './components/SearchControl';
import { ClusterBubble, Cluster } from './components/ClusterBubble';
import authService from './services/authService';
import apiService from './services/apiService';
import { processedImageToApi, apiToProcessedImage } from './utils/dataConverters';


// --- TYPE DECLARATIONS for global libraries ---
declare const L: any;
declare const EXIF: any;

// --- SOUND DEFINITIONS ---
const synth = new Tone.Synth({
  oscillator: { type: 'sine' },
  envelope: {
    attack: 0.01,
    decay: 0.2,
    sustain: 0,
    release: 0.2,
  },
}).toDestination();


const ensureAudioContext = async () => {
    if (Tone.context.state !== 'running') {
        await Tone.start();
    }
};


// --- PROMPT DEFINITIONS ---
const PROMPT_STYLE_GUIDANCE = "The style must be 3D isometric pixel art. The object must be isolated on a plain white background with no shadows. Do not include any explanatory text in the response; output only the final image.";
const IMAGE_PROMPT_WITH_LOCATION = (location?: string) => {
    const locationContext = location ? `This photo was taken in ${location}. ` : '';
    return `From the provided image, create a 3D isometric pixel art version of the key object or building. ${locationContext}Consider the local architectural style and cultural elements when creating the pixel art. ${PROMPT_STYLE_GUIDANCE}`;
};
const IMAGE_PROMPT = IMAGE_PROMPT_WITH_LOCATION(); // Default without location
const EDIT_PROMPT_TEMPLATE = (input: string, location?: string) => {
    const locationContext = location ? `This is located in ${location}. ` : '';
    return `${input}. ${locationContext}${PROMPT_STYLE_GUIDANCE}`;
};


const IMAGE_WIDTH = 120; 

const COLOR_DISTANCE_THRESHOLD = 20;
const MOVE_AMOUNT = 0.001; // Lat/Lng move amount for keyboard
const CLUSTER_ZOOM_THRESHOLD = 6;
const CLUSTER_RADIUS_PX = 90;

export interface LogData {
  location: string;
  date: string;
  musings: string;
}

export interface PhotoData {
  url: string; // The object URL
  file: File;
}

export interface ProcessedImage {
  id: number;
  sourceFile?: File;
  sourceText?: string;
  processedImage: HTMLImageElement | null;
  showOriginal?: boolean;
  lat: number;
  lng: number;
  width: number;
  height: number;
  isGenerating: boolean;
  contentBounds: { x: number; y: number; width: number; height: number; };
  flippedHorizontally?: boolean;
  isLocked?: boolean;
  photos: PhotoData[];
  log: LogData;
}

export type MapDisplayItem = ProcessedImage | Cluster;

interface ImageProcessingResult {
    transparentImage: HTMLImageElement;
    contentBounds: { x: number; y: number; width: number; height: number; };
}

interface PhotoPreviewState {
    photos: PhotoData[];
    currentIndex: number;
}

// --- HELPER FUNCTIONS ---

const getExifData = (file: File): Promise<{ lat: number; lng: number; date: string } | null> => {
    return new Promise((resolve) => {
        EXIF.getData(file, function(this: any) {
            try {
                const lat = EXIF.getTag(this, "GPSLatitude");
                const lng = EXIF.getTag(this, "GPSLongitude");
                const latRef = EXIF.getTag(this, "GPSLatitudeRef");
                const lngRef = EXIF.getTag(this, "GPSLongitudeRef");

                let dateStr: string | null = EXIF.getTag(this, "DateTimeOriginal");
                if (dateStr) {
                    const parts = dateStr.split(' ')[0].split(':');
                    dateStr = `${parts[0]}-${parts[1]}-${parts[2]}`;
                } else {
                    dateStr = new Date().toISOString().split('T')[0];
                }

                if (!lat || !lng || !latRef || !lngRef) {
                    resolve(null);
                    return;
                }

                const dmsToDd = (dms: number[], ref: 'N' | 'S' | 'E' | 'W'): number => {
                    const dd = dms[0] + dms[1] / 60 + dms[2] / 3600;
                    return (ref === 'S' || ref === 'W') ? -dd : dd;
                };

                const latitude = dmsToDd(lat, latRef);
                const longitude = dmsToDd(lng, lngRef);
                
                resolve({ lat: latitude, lng: longitude, date: dateStr });

            } catch(e) {
                console.error("Error reading EXIF data", e);
                resolve(null);
            }
        });
    });
};

const reverseGeocode = async (lat: number, lng: number, lang: 'en' | 'zh'): Promise<string> => {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=${lang}&zoom=18`);
        if (!response.ok) return "An interesting place";

        const data = await response.json();
        const { address } = data;

        if (!address) {
            return data.display_name || "A wonderful location";
        }

        const poi = address.tourism || address.amenity || address.shop || address.historic || address.public_building || data.name;
        const city = address.city || address.town || address.village;
        const country = address.country;
        
        if (poi && city) {
            return `${poi}, ${city}`;
        }
        
        if (city && country) {
            return `${city}, ${country}`;
        }
        
        return data.display_name || "A wonderful location";

    } catch (error) {
        console.error("Reverse geocoding failed", error);
        return "A wonderful location";
    }
};


const processImageForTransparency = (imageUrl: string): Promise<ImageProcessingResult> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return reject(new Error('Could not get 2d context'));
      
      ctx.drawImage(img, 0, 0);
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        const bgR = data[0], bgG = data[1], bgB = data[2];
        const thresholdSquared = COLOR_DISTANCE_THRESHOLD * COLOR_DISTANCE_THRESHOLD;

        let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const distanceSquared = (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2;
          if (distanceSquared < thresholdSquared) {
            data[i + 3] = 0;
          }
        }
        
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                if (data[(y * canvas.width + x) * 4 + 3] > 0) {
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
        
        const transparentImage = new Image();
        transparentImage.src = canvas.toDataURL();
        transparentImage.onload = () => {
            const contentBounds = (maxX >= minX && maxY >= minY) 
                ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
                : { x: 0, y: 0, width: canvas.width, height: canvas.height };
            resolve({ transparentImage, contentBounds });
        };
        transparentImage.onerror = (err) => reject(err);
      } catch (error) {
         console.error("Error processing image for transparency:", error);
         resolve({ transparentImage: img, contentBounds: { x: 0, y: 0, width: img.width, height: img.height }});
      }
    };
    img.onerror = (err) => reject(err);
    img.src = imageUrl;
  });
};

export const imageElementToFile = async (imageElement: HTMLImageElement, fileName: string): Promise<File> => {
    const canvas = document.createElement('canvas');
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get 2d context for image conversion");
    ctx.drawImage(imageElement, 0, 0);
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) resolve(new File([blob], fileName, { type: 'image/png' }));
            else reject(new Error("Canvas to Blob conversion failed"));
        }, 'image/png');
    });
};

// --- DATA CONVERSION HELPERS for EXPORT/IMPORT ---
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const imageElementToBase64 = (imageElement: HTMLImageElement): string => {
    const canvas = document.createElement('canvas');
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get 2d context for image conversion");
    ctx.drawImage(imageElement, 0, 0);
    return canvas.toDataURL('image/png');
};

const base64ToImageElement = (base64: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = base64;
    });
};

const base64ToFile = async (base64: string, filename: string): Promise<File> => {
    const res = await fetch(base64);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
};


const App: React.FC = () => {
  const { t, language, toggleLanguage } = useLocalization();
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [draggingImage, setDraggingImage] = useState<{ id: number; startX: number; startY: number; startLat: number; startLng: number } | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const nextId = useRef(0);
  const previewImageCache = useRef<Record<number, HTMLImageElement>>({});
  const prevImagesRef = useRef<ProcessedImage[]>([]);
  const [animationTick, setAnimationTick] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importFileContent, setImportFileContent] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [placementInfo, setPlacementInfo] = useState<{file: File} | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [photoPreviewState, setPhotoPreviewState] = useState<PhotoPreviewState | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const memoryToAddPhotoTo = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState<{ active: boolean; message: string } | null>(null);
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [currentMapId, setCurrentMapId] = useState<number | null>(null);
  const currentMapIdRef = useRef<number | null>(null);

  const mapRef = useRef<any | null>(null);
  const tileLayerRef = useRef<any | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapState, setMapState] = useState({ isReady: false });

  const selectedImage = useMemo(() =>
    selectedImageId !== null ? images.find(img => img.id === selectedImageId) : null,
    [images, selectedImageId]
  );

  const itemsToDisplay = useMemo((): MapDisplayItem[] => {
    if (!mapRef.current || !mapState.isReady) {
        return images;
    }

    const zoom = mapRef.current.getZoom();
    if (zoom > CLUSTER_ZOOM_THRESHOLD) {
      return images;
    }

    const clusters: Cluster[] = [];
    const clusteredImageIds = new Set<number>();

    const imagesToProcess = [...images].sort((a, b) => b.id - a.id);

    for (const image of imagesToProcess) {
      if (clusteredImageIds.has(image.id)) {
        continue;
      }

      const currentClusterMembers: ProcessedImage[] = [image];
      const screenPoint1 = mapRef.current.latLngToContainerPoint([image.lat, image.lng]);

      for (const otherImage of imagesToProcess) {
        if (otherImage.id === image.id || clusteredImageIds.has(otherImage.id)) {
          continue;
        }

        const screenPoint2 = mapRef.current.latLngToContainerPoint([otherImage.lat, otherImage.lng]);
        const distance = Math.sqrt(
          Math.pow(screenPoint1.x - screenPoint2.x, 2) +
          Math.pow(screenPoint1.y - screenPoint2.y, 2)
        );

        if (distance < CLUSTER_RADIUS_PX) {
          currentClusterMembers.push(otherImage);
        }
      }

      if (currentClusterMembers.length > 1) {
        currentClusterMembers.forEach(member => clusteredImageIds.add(member.id));
        
        const latitudes = currentClusterMembers.map(img => img.lat);
        const longitudes = currentClusterMembers.map(img => img.lng);

        clusters.push({
          id: `cluster-${image.id}`,
          images: currentClusterMembers,
          lat: latitudes.reduce((a, b) => a + b, 0) / latitudes.length,
          lng: longitudes.reduce((a, b) => a + b, 0) / longitudes.length,
          count: currentClusterMembers.length,
          representativeImage: image,
        });
      }
    }
    
    const unclusteredImages = images.filter(img => !clusteredImageIds.has(img.id));

    return [...clusters, ...unclusteredImages];
  }, [images, mapState]);
  
  // --- MAP INITIALIZATION ---
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        worldCopyJump: true,
      });
      
      const updateMapState = () => setMapState(prev => ({...prev}));
      map.on('move', updateMapState);
      map.on('zoom', updateMapState);

      mapRef.current = map;
      setMapState({ isReady: true });
    }
  }, []);
  
  // Authentication initialization
  useEffect(() => {
    const initAuth = async () => {
      if (authService.isAuthenticated()) {
        try {
          const syncData = await authService.syncUserData();
          setUser(syncData.user);
          setIsAuthenticated(true);

          if (syncData.defaultMapId) {
            setCurrentMapId(syncData.defaultMapId);
            currentMapIdRef.current = syncData.defaultMapId;
            await loadMapData(syncData.defaultMapId);
          } else {
            console.warn('No defaultMapId returned from sync');
          }
        } catch (error) {
          console.error('Auth sync failed:', error);
          setShowAuthModal(true);
        }
      } else {
        setShowAuthModal(true);
      }
    };

    initAuth();
  }, []);
  
  // Set tile layer
  useEffect(() => {
      if (!mapState.isReady || !mapRef.current) return;

      const map = mapRef.current;

      if (tileLayerRef.current) {
          map.removeLayer(tileLayerRef.current);
      }

      const tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      const tileOptions = {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      };
      
      const newTileLayer = L.tileLayer(tileUrl, tileOptions);
      newTileLayer.addTo(map);
      tileLayerRef.current = newTileLayer;

  }, [mapState.isReady]);

  // --- AUTHENTICATION FUNCTIONS ---
  const loadMapData = useCallback(async (mapId: number) => {
    if (!mapId) {
      console.warn('No mapId provided to loadMapData');
      return;
    }

    console.log('Loading map data for mapId:', mapId);

    try {
      setIsLoading({ active: true, message: t('loading') });
      console.log('Fetching map data from API...');
      const mapResponse = await apiService.getMap(mapId);
      console.log('Map response received:', mapResponse);

      const { memories } = mapResponse;
      console.log('Processing', memories.length, 'memories');

      const processedImages = await Promise.all(
        memories.map((memory: any) => apiToProcessedImage(memory))
      );

      console.log('Processed images:', processedImages.length);
      setImages(processedImages);
      nextId.current = Math.max(...processedImages.map(img => img.id), 0) + 1;
      console.log('Map data loaded successfully');
    } catch (error) {
      console.error('Failed to load map data:', error);
      setToastMessage('Failed to load your travel memories');
    } finally {
      console.log('Clearing loading state');
      setIsLoading(null);
    }
  }, [t]);
  
  const handleAuthSuccess = useCallback(async () => {
    const syncData = await authService.syncUserData();
    setUser(syncData.user);
    setCurrentMapId(syncData.defaultMapId);
    currentMapIdRef.current = syncData.defaultMapId;
    setIsAuthenticated(true);
    setShowAuthModal(false);

    await loadMapData(syncData.defaultMapId);
  }, [loadMapData]);
  
  const handleLogout = useCallback(async () => {
    try {
      await authService.logout();
      setIsAuthenticated(false);
      setUser(null);
      setCurrentMapId(null);
      currentMapIdRef.current = null;
      setImages([]);
      setShowAuthModal(true);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, []);

  // --- API SAVE FUNCTIONS ---
  const saveMemoryToApi = useCallback(async (image: ProcessedImage) => {
    const mapId = currentMapIdRef.current;
    if (!mapId) {
      console.warn('No currentMapId, cannot save memory');
      return;
    }

    console.log('Saving memory to API:', image.id, 'mapId:', mapId);
    try {
      const apiData = await processedImageToApi(image, mapId);
      console.log('API data prepared:', apiData);
      const result = await apiService.addMemory(apiData);
      console.log('Memory saved successfully:', result);
    } catch (error) {
      console.error('Failed to save memory:', error);
      setToastMessage('Failed to save memory');
    }
  }, []);
  
  const updateMemoryInApi = useCallback(async (image: ProcessedImage) => {
    if (!currentMapId) return;
    
    try {
      const apiData = await processedImageToApi(image, currentMapId);
      await apiService.updateMemory(image.id, apiData);
    } catch (error) {
      console.error('Failed to update memory:', error);
      setToastMessage('Failed to update memory');
    }
  }, [currentMapId]);

  // --- IMAGE GENERATION & PLACEMENT ---
  const generateFromImage = useCallback(async (file: File, id: number, prompt: string, isRegenerate: boolean = false, location?: string) => {
    try {
      const { imageUrl } = await generateImageWithPrompt(file, prompt);
      if (!imageUrl) throw new Error("Generation failed, no image returned.");

      const { transparentImage, contentBounds } = await processImageForTransparency(imageUrl);
      const aspectRatio = transparentImage.width / transparentImage.height;

      setImages(prev => prev.map(img => {
        if (img.id !== id) return img;
        const newWidth = IMAGE_WIDTH;
        const newHeight = IMAGE_WIDTH / aspectRatio;
        const updatedImg = {
          ...img,
          processedImage: transparentImage,
          showOriginal: false,
          contentBounds,
          width: newWidth,
          height: newHeight,
          isGenerating: false,
        };

        // Save to API when generation is complete
        // For regeneration, use update; for new images, use save
        if (isRegenerate) {
          updateMemoryInApi(updatedImg).catch(console.error);
        } else {
          saveMemoryToApi(updatedImg).catch(console.error);
        }

        return updatedImg;
      }));
    } catch (e) {
      console.error('Generation failed:', e);
      // On error, reset the isGenerating flag
      setImages(prev => prev.map(img =>
        img.id === id ? { ...img, isGenerating: false } : img
      ));
    }
  }, [saveMemoryToApi, updateMemoryInApi]);

  const addImageAtLatLng = useCallback((file: File, latlng: {lat: number, lng: number}, logInfo: {location: string, date: string}) => {
    (async () => {
        await ensureAudioContext();
        synth.triggerAttackRelease('C4', '8n');
    })();
    
    const id = nextId.current++;
    const sourcePreviewUrl = URL.createObjectURL(file);
    previewImageCache.current[id] = new Image();
    previewImageCache.current[id].src = sourcePreviewUrl;
    
    const PLACEHOLDER_WIDTH = 120;
    const newImage: ProcessedImage = {
        id, sourceFile: file, processedImage: null,
        lat: latlng.lat, lng: latlng.lng,
        width: PLACEHOLDER_WIDTH, height: PLACEHOLDER_WIDTH,
        isGenerating: true,
        contentBounds: { x: 0, y: 0, width: PLACEHOLDER_WIDTH, height: PLACEHOLDER_WIDTH },
        flippedHorizontally: false, isLocked: false,
        photos: [{file, url: sourcePreviewUrl}],
        log: {
            location: logInfo.location,
            date: logInfo.date,
            musings: ''
        }
    };
    setImages(prev => [...prev, newImage]);
    const locationPrompt = IMAGE_PROMPT_WITH_LOCATION(logInfo.location);
    generateFromImage(file, id, locationPrompt, false, logInfo.location);
    return id; // Return synchronously
  }, [generateFromImage]);
  
  const startImagePlacement = useCallback(async (file: File) => {
      if(!mapRef.current) return;
      const exifData = await getExifData(file);
      if (exifData) {
          const locationName = await reverseGeocode(exifData.lat, exifData.lng, language);
          setToastMessage(`${t('toastLocationFound')} ${locationName}.`);
          mapRef.current.flyTo([exifData.lat, exifData.lng], 16);
          addImageAtLatLng(file, exifData, {location: locationName, date: exifData.date});
      } else {
          setPlacementInfo({ file });
      }
  }, [addImageAtLatLng, language, t]);

  // Map click handler to deal with placement and selection
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e: any) => {
      if (placementInfo) {
        const file = placementInfo.file;
        const latlng = e.latlng;
        const date = new Date().toISOString().split('T')[0];
        
        // UI Update first
        setPlacementInfo(null);
        const newImageId = addImageAtLatLng(file, latlng, {date, location: t('loadingLocation')});

        // Geocode and update name later
        (async () => {
          const locationName = await reverseGeocode(latlng.lat, latlng.lng, language);
          setImages(prev => prev.map(img => 
            img.id === newImageId 
              ? { ...img, log: { ...img.log, location: locationName } } 
              : img
          ));
        })();
      } else {
        setSelectedImageId(null);
      }
    };

    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
    };
  }, [placementInfo, language, addImageAtLatLng, t]);


  // --- EVENT HANDLERS ---
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setPlacementInfo(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/') && mapRef.current) {
        (async () => {
          const exifData = await getExifData(file);
          if (exifData) {
              const locationName = await reverseGeocode(exifData.lat, exifData.lng, language);
              setToastMessage(`${t('toastLocationFound')} ${locationName}.`);
              mapRef.current.flyTo([exifData.lat, exifData.lng], 16);
              addImageAtLatLng(file, exifData, {location: locationName, date: exifData.date});
          } else {
              setToastMessage(t('toastNoLocationFound'));
              const point = L.point(e.clientX, e.clientY);
              const latlng = mapRef.current.containerPointToLatLng(point);
              const date = new Date().toISOString().split('T')[0];
              
              const newImageId = addImageAtLatLng(file, latlng, {location: t('loadingLocation'), date});

              const locationName = await reverseGeocode(latlng.lat, latlng.lng, language);
              setImages(prev => prev.map(img => 
                img.id === newImageId 
                  ? { ...img, log: { ...img.log, location: locationName } } 
                  : img
              ));
          }
        })();
      }
    }
  }, [addImageAtLatLng, language, t]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (file.type.startsWith('image/')) {
            if (memoryToAddPhotoTo.current !== null) {
                handleAddPhotoToMemory(memoryToAddPhotoTo.current, file);
                memoryToAddPhotoTo.current = null;
            } else {
                startImagePlacement(file);
            }
        }
        e.target.value = '';
    }
  };

  const handleAddPhotoToMemory = useCallback(async (memoryId: number, file: File) => {
    if (file.type.startsWith('image/')) {
        await ensureAudioContext();
        synth.triggerAttackRelease('G5', '8n');
        const url = URL.createObjectURL(file);
        const newPhoto: PhotoData = { file, url };
        setImages(prev => prev.map(img => img.id === memoryId
            ? { ...img, photos: [...img.photos, newPhoto] }
            : img
        ));
    }
  }, []);

  const handleDeletePhotoFromMemory = useCallback(async (memoryId: number, photoIndex: number) => {
    await ensureAudioContext();
    synth.triggerAttackRelease('A3', '8n');

    setImages(prev => {
        const memory = prev.find(img => img.id === memoryId);
        if (!memory) return prev;

        if (memory.photos.length === 1) {
            if (selectedImageId === memoryId) {
                setSelectedImageId(null);
            }
            return prev.filter(img => img.id !== memoryId);
        }

        const updatedPhotos = memory.photos.filter((_, idx) => idx !== photoIndex);
        return prev.map(img => img.id === memoryId ? { ...img, photos: updatedPhotos } : img);
    });
  }, [selectedImageId]);

  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            startImagePlacement(file);
            event.preventDefault(); return;
          }
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [startImagePlacement]);

  const handleInteractionStart = (e: React.MouseEvent<HTMLDivElement>, targetImage: ProcessedImage) => {
    e.stopPropagation();

    if (selectedImageId !== targetImage.id) {
        setSelectedImageId(targetImage.id);
    }
    
    if (targetImage.isLocked) return;

    setDraggingImage({ 
        id: targetImage.id, 
        startX: e.clientX,
        startY: e.clientY,
        startLat: targetImage.lat,
        startLng: targetImage.lng
    });

    setImages(prev => [...prev.filter(img => img.id !== targetImage.id), targetImage]);
  };

  const handleInteractionMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingImage && mapRef.current) {
        const startPoint = mapRef.current.latLngToContainerPoint(L.latLng(draggingImage.startLat, draggingImage.startLng));
        const newPoint = L.point(startPoint.x + (e.clientX - draggingImage.startX), startPoint.y + (e.clientY - draggingImage.startY));
        const newLatLng = mapRef.current.containerPointToLatLng(newPoint);
        
        setImages(prev => prev.map(img => img.id === draggingImage.id ? {
            ...img,
            lat: newLatLng.lat,
            lng: newLatLng.lng,
        } : img));
    }
  };

  const handleInteractionEnd = useCallback(async () => {
    if (draggingImage) {
      const imageId = draggingImage.id;
      const finalImageState = images.find(img => img.id === imageId);

      setDraggingImage(null);

      if (finalImageState) {
        const newLocationName = await reverseGeocode(finalImageState.lat, finalImageState.lng, language);
        setImages(prev => prev.map(img =>
          img.id === imageId
            ? { ...img, log: { ...img.log, location: newLocationName } }
            : img
        ));
      }
    }
  }, [draggingImage, images, language]);

  const handleClusterClick = useCallback((cluster: Cluster) => {
    if (!mapRef.current) return;
    const bounds = L.latLngBounds(cluster.images.map(img => [img.lat, img.lng]));
    mapRef.current.flyToBounds(bounds.pad(0.5), { animate: true, duration: 1 });
  }, []);

  // --- LIFECYCLE & CLEANUP ---
  useEffect(() => {
    const isGenerating = images.some(img => img.isGenerating);
    let intervalId: number | undefined;
    if (isGenerating) {
        intervalId = window.setInterval(() => setAnimationTick(tick => tick + 1), 200);
    }
    return () => clearInterval(intervalId);
  }, [images]);

  useEffect(() => {
    const currentUrls = new Set(images.flatMap(i => i.photos.map(p => p.url)));
    const prevUrls = new Set(prevImagesRef.current.flatMap(i => i.photos.map(p => p.url)));
    
    prevUrls.forEach(url => {
        if (url.startsWith('blob:') && !currentUrls.has(url)) {
            URL.revokeObjectURL(url);
            const entry = Object.entries(previewImageCache.current).find(([, img]) => img.src === url);
            if(entry) delete previewImageCache.current[parseInt(entry[0], 10)];
        }
    });

    prevImagesRef.current = images;
  }, [images]);

  useEffect(() => {
    const prevImagesMap = new Map(prevImagesRef.current.map(img => [img.id, img]));
    images.forEach(img => {
        const prevImg = prevImagesMap.get(img.id);
        if (prevImg && prevImg.isGenerating && !img.isGenerating) {
            (async () => {
                await ensureAudioContext();
                synth.triggerAttackRelease('C5', '8n');
            })();
        }
    });
  }, [images]);
  
  useEffect(() => {
      if (toastMessage) {
          const timer = setTimeout(() => {
              setToastMessage(null);
          }, 5000);
          return () => clearTimeout(timer);
      }
  }, [toastMessage]);

  useEffect(() => {
      if (selectedImageId) {
          const isClustered = itemsToDisplay
              .filter((item): item is Cluster => 'count' in item && 'images' in item)
              .some(cluster => cluster.images.some(img => img.id === selectedImageId));
          
          if (isClustered) {
              setSelectedImageId(null);
          }
      }
  }, [itemsToDisplay, selectedImageId]);

  // --- ACTIONS ---
  const handleDeleteSelected = async () => {
    if (!selectedImage) return;
    await ensureAudioContext();
    synth.triggerAttackRelease('A4', '8n');

    try {
      // Delete from database via API
      await apiService.deleteMemory(selectedImage.id);

      // Remove from React state
      setImages(prev => prev.filter(img => img.id !== selectedImageId));
      setSelectedImageId(null);
    } catch (error) {
      console.error('Failed to delete memory:', error);
      // Still remove from state even if API fails, user can refresh to see actual state
      setImages(prev => prev.filter(img => img.id !== selectedImageId));
      setSelectedImageId(null);
    }
  };

  const handleRegenerateSelected = () => {
      if (!selectedImage) return;
      setImages(prev => prev.map(img => img.id === selectedImageId ? {...img, isGenerating: true } : img));
      if (selectedImage.sourceFile) {
          const location = selectedImage.log?.location;
          const locationPrompt = IMAGE_PROMPT_WITH_LOCATION(location);
          generateFromImage(selectedImage.sourceFile, selectedImage.id, locationPrompt, true, location);
      }
  };

  const handleEditSelected = async (prompt: string) => {
    if (!selectedImage || !selectedImage.processedImage) return;
    await ensureAudioContext(); synth.triggerAttackRelease('E4', '8n');
    const imageFile = await imageElementToFile(selectedImage.processedImage, `edit_source_${selectedImage.id}.png`);
    setImages(prev => prev.map(img => img.id === selectedImageId ? { ...img, isGenerating: true, sourceFile: imageFile } : img));
    const location = selectedImage.log?.location;
    const finalPrompt = EDIT_PROMPT_TEMPLATE(prompt, location);
    generateFromImage(imageFile, selectedImage.id, finalPrompt, true, location);
  };

  const handleFlipSelected = async () => {
    if (!selectedImage) return;
    await ensureAudioContext(); synth.triggerAttackRelease('G5', '8n');
    setImages(prev => prev.map(img => img.id === selectedImageId ? { ...img, flippedHorizontally: !img.flippedHorizontally } : img));
  };
  
  const handleDuplicateSelected = async () => {
    if (!selectedImage || !mapRef.current) return;

    await ensureAudioContext(); synth.triggerAttackRelease('C4', '8n');
    const screenPoint = mapRef.current.latLngToContainerPoint(L.latLng(selectedImage.lat, selectedImage.lng));
    const newScreenPoint = L.point(screenPoint.x + 40, screenPoint.y + 20);
    const newLatLng = mapRef.current.containerPointToLatLng(newScreenPoint);
    const newId = nextId.current++;
    const duplicatedImage: ProcessedImage = {
        ...selectedImage, id: newId, lat: newLatLng.lat, lng: newLatLng.lng
    };
    if (previewImageCache.current[selectedImage.id]) {
        previewImageCache.current[newId] = previewImageCache.current[selectedImage.id];
    }
    setImages(prev => [...prev, duplicatedImage]);
    setSelectedImageId(newId);
  };

  const handleScaleSelected = (factor: number) => {
    if (!selectedImage) return;
    setImages(prev => prev.map(img => {
        if (img.id !== selectedImageId) return img;
        return { ...img, width: img.width * factor, height: img.height * factor };
    }));
  };
  
  const handleLockSelected = async () => {
    if (!selectedImage) return;
    await ensureAudioContext();
    synth.triggerAttackRelease('E5', '8n');
    setImages(prev => prev.map(img => img.id === selectedImageId ? { ...img, isLocked: true } : img));
  };

  const handleUnlockSelected = async () => {
    if (!selectedImage) return;
    await ensureAudioContext();
    synth.triggerAttackRelease('C5', '8n');
    setImages(prev => prev.map(img => img.id === selectedImageId ? { ...img, isLocked: false } : img));
  };
  
  const handleViewPhoto = (photoIndex: number) => {
      if (selectedImage) {
        setPhotoPreviewState({ photos: selectedImage.photos, currentIndex: photoIndex });
      }
  };

  const handlePhotoPreviewNext = () => {
    setPhotoPreviewState(prev => {
        if (!prev) return null;
        const nextIndex = (prev.currentIndex + 1) % prev.photos.length;
        return { ...prev, currentIndex: nextIndex };
    });
  };

  const handlePhotoPreviewPrevious = () => {
    setPhotoPreviewState(prev => {
        if (!prev) return null;
        const prevIndex = (prev.currentIndex - 1 + prev.photos.length) % prev.photos.length;
        return { ...prev, currentIndex: prevIndex };
    });
  };
  
  const handleEditLog = () => setShowLogModal(true);
  
  const handleSaveLog = (updatedLog: LogData, newCoords: { lat: number, lng: number } | null) => {
      if (selectedImageId === null) return;
      
      setImages(prev => prev.map(img => {
          if (img.id !== selectedImageId) return img;
          
          const updates: Partial<ProcessedImage> = { log: updatedLog };
          if (newCoords) {
              updates.lat = newCoords.lat;
              updates.lng = newCoords.lng;
          }
          
          const updatedImg = { ...img, ...updates };
          
          // Save to API
          updateMemoryInApi(updatedImg).catch(console.error);
          
          return updatedImg;
      }));
      setShowLogModal(false);
  };

  const handleAddPhotoClick = () => {
      memoryToAddPhotoTo.current = selectedImageId;
      fileInputRef.current?.click();
  };

  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    if (mapRef.current) {
        mapRef.current.flyTo([lat, lng], 13, {
            animate: true,
            duration: 1.5
        });
    }
  }, []);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        
        const currentImage = selectedImageId !== null ? images.find(img => img.id === selectedImageId) : null;

        if (e.key === 'o' && currentImage) {
            if (currentImage && currentImage.sourceFile) {
              e.preventDefault();
              setImages(prev => prev.map(img => img.id === selectedImageId ? { ...img, showOriginal: !img.showOriginal } : img));
            }
            return;
        }

        if (!currentImage || currentImage.isGenerating || currentImage.isLocked) return;

        const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (arrowKeys.includes(e.key)) {
            e.preventDefault();
            (async () => { await ensureAudioContext(); synth.triggerAttackRelease('G4', '8n'); })();
            let newLat = currentImage.lat, newLng = currentImage.lng;
            const zoomFactor = 1 / (mapRef.current.getZoom() ** 2);
            switch (e.key) {
                case 'ArrowUp':    newLat += MOVE_AMOUNT * zoomFactor; break;
                case 'ArrowDown':  newLat -= MOVE_AMOUNT * zoomFactor; break;
                case 'ArrowLeft':  newLng -= MOVE_AMOUNT * zoomFactor; break;
                case 'ArrowRight': newLng += MOVE_AMOUNT * zoomFactor; break;
            }
            setImages(prev => prev.map(img => img.id === selectedImageId ? { ...img, lat: newLat, lng: newLng } : img));
            return;
        }
        switch (e.key) {
            case 'Delete': case 'Backspace': handleDeleteSelected(); break; case 'r': handleRegenerateSelected(); break;
            case 'f': handleFlipSelected(); break; case 'd': handleDuplicateSelected(); break;
            case '=': case '+': handleScaleSelected(1.1); break; case '-': handleScaleSelected(1 / 1.1); break;
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageId, images, handleScaleSelected]);

  const handleResetCanvas = async () => {
    if (!currentMapId) return;
    
    try {
      // Clear all memories from the current map
      for (const image of images) {
        await apiService.deleteMemory(image.id);
      }
      
      setImages([]);
      setShowResetConfirm(false);
      mapRef.current?.setView([20, 0], 2);
      setToastMessage('Map reset successfully');
    } catch (error) {
      console.error('Failed to reset map:', error);
      setToastMessage('Failed to reset map');
    }
  };
  
  // --- EXPORT / IMPORT ---
  const handleExport = async () => {
    if (!currentMapId || images.length === 0) return;
    
    setIsLoading({ active: true, message: t('loadingExport') });
    await ensureAudioContext();
    synth.triggerAttackRelease('C5', '8n');

    try {
        const exportData = await apiService.exportMap(currentMapId);
        
        // Create and download file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pixelmap-${new Date().toISOString().split('T')[0]}.pixmap`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setToastMessage(t('exportMap') + ' completed!');
    } catch (error) {
        console.error('Export failed:', error);
        setToastMessage('Export failed');
    } finally {
        setIsLoading(null);
    }
  };

  const handleImportFile = async (file: File) => {
    if (!currentMapId) return;
    
    setIsLoading({ active: true, message: t('loadingImport') });

    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (!data.memories || !Array.isArray(data.memories)) {
            throw new Error(t('errorInvalidFile'));
        }
        
        // Import memories to current map
        await apiService.importMap(currentMapId, data.memories, true); // Clear existing
        
        // Reload map data
        await loadMapData(currentMapId);
        
        setToastMessage(t('importSuccess'));
    } catch (error) {
        console.error('Import failed:', error);
        setToastMessage(t('errorInvalidFile'));
    } finally {
        setIsLoading(null);
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pixmap')) {
        setToastMessage(t('errorInvalidFile'));
        if (importInputRef.current) importInputRef.current.value = '';
        return;
    }

    // Direct import with the new API-based function
    handleImportFile(file);
    if (importInputRef.current) importInputRef.current.value = '';
  };
  
  const confirmImport = async () => {
    if (!importFileContent) return;
    
    setShowImportConfirm(false);
    setIsLoading({ active: true, message: t('loadingImport') });
    await ensureAudioContext(); synth.triggerAttackRelease('G5', '8n');
    
    try {
        const data = JSON.parse(importFileContent);
        if (data.version !== "1.0.0" || !Array.isArray(data.memories)) {
            throw new Error("Invalid or unsupported file format.");
        }

        const reconstructedImages: ProcessedImage[] = await Promise.all(
            data.memories.map(async (mem: any): Promise<ProcessedImage> => {
                const newId = nextId.current++;

                const processedImage = mem.processedImageBase64
                    ? await base64ToImageElement(mem.processedImageBase64)
                    : null;
                
                const photos: PhotoData[] = await Promise.all(
                    mem.photos.map(async (photoData: any): Promise<PhotoData> => {
                        const file = await base64ToFile(photoData.base64, photoData.name);
                        const url = URL.createObjectURL(file);
                        return { file, url };
                    })
                );
                
                if (photos[0]?.file) {
                    previewImageCache.current[newId] = new Image();
                    previewImageCache.current[newId].src = photos[0].url;
                }

                return {
                    ...mem,
                    id: newId,
                    processedImage,
                    photos,
                    sourceFile: photos[0]?.file, // Set first photo as sourceFile
                };
            })
        );
        
        setImages(reconstructedImages);
        mapRef.current?.setView([20,0], 2);
        setToastMessage(t('importSuccess'));

    } catch (error) {
        console.error("Import failed:", error);
        setToastMessage("Import failed. Invalid file.");
    } finally {
        setIsLoading(null);
        setImportFileContent(null);
    }
  };


  // --- RENDER ---
  const sortedItems = useMemo(() => 
    [...itemsToDisplay].sort((a, b) => b.lat - a.lat), 
    [itemsToDisplay]
  );

  return (
    <div
      className="w-screen h-screen bg-white relative"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onMouseMove={handleInteractionMove}
      onMouseUp={handleInteractionEnd}
      onMouseLeave={handleInteractionEnd}
    >
        <div ref={mapContainerRef} id="map" className="absolute inset-0 z-0" />

        {mapState.isReady && (
            <SearchControl onLocationSelect={handleLocationSelect} />
        )}
        
        {mapState.isReady && mapRef.current && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                {sortedItems.map(item => {
                    if ('count' in item && 'images' in item) { // Type guard for Cluster
                        return (
                            <ClusterBubble
                                key={item.id}
                                cluster={item}
                                map={mapRef.current}
                                onClick={handleClusterClick}
                            />
                        );
                    } else { // It's a ProcessedImage
                        const img = item as ProcessedImage;
                        return (
                             <ImageMarker
                                key={img.id}
                                img={img}
                                map={mapRef.current}
                                isSelected={selectedImageId === img.id}
                                isDragging={draggingImage?.id === img.id}
                                animationTick={animationTick}
                                previewImageCache={previewImageCache}
                                onInteractionStart={handleInteractionStart}
                                onAddPhotoToMemory={handleAddPhotoToMemory}
                            />
                        );
                    }
                })}
            </div>
        )}

        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*"/>
        <input type="file" ref={importInputRef} onChange={handleImportFileChange} className="hidden" accept=".pixmap" />

        {isLoading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
                <div className="flex flex-col items-center gap-4">
                    <svg className="animate-spin h-8 w-8 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-black">{isLoading.message}</p>
                </div>
            </div>
        )}

        {images.length === 0 && !placementInfo && !isLoading && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none p-4 z-20 max-w-[90vw]">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-black mb-2 sm:mb-4">{t('welcomeTitle')}</h1>
            <p className="text-sm sm:text-base text-neutral-600 mb-1 sm:mb-2">{t('welcomeSubtitle')}</p>
            <p className="text-xs sm:text-sm text-neutral-500">{t('welcomeInstructions')}</p>
          </div>
        )}
        
        {toastMessage && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-md shadow-lg z-40 animate-toast flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                {toastMessage}
            </div>
        )}

        {placementInfo && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[200px] bg-white p-4 border border-black shadow-lg z-40">
                <p>{t('placementPrompt')}</p>
                <button onClick={() => setPlacementInfo(null)} className="absolute top-1 right-1 text-xl leading-none px-2">&times;</button>
            </div>
        )}

        <div className="absolute top-2 sm:top-4 left-2 sm:left-16 right-2 sm:right-auto flex flex-wrap sm:flex-nowrap items-center gap-1 sm:gap-2 pointer-events-none z-20">
            <p className="text-sm sm:text-lg text-black mr-auto sm:mr-0">{t('appName')}</p>
            {isAuthenticated && user && (
                <span className="text-xs sm:text-sm text-black bg-white/80 px-1 sm:px-2 py-0.5 sm:py-1 border border-black">
                    {user.username}
                </span>
            )}
            <button onClick={() => setShowHelpModal(true)} className="pointer-events-auto w-6 h-6 sm:w-6 sm:h-6 flex items-center justify-center border border-black rounded-full text-black bg-white/80 text-xs" aria-label={t('showHelp')}>?</button>
            <button onClick={() => setShowSettingsModal(true)} className="pointer-events-auto w-6 h-6 sm:w-6 sm:h-6 flex items-center justify-center border border-black rounded-full text-black bg-white/80 text-xs" aria-label="Settings">⚙️</button>
            <button onClick={toggleLanguage} className="pointer-events-auto w-6 h-6 sm:w-6 sm:h-6 flex items-center justify-center border border-black rounded-full text-black bg-white/80 text-xs" aria-label={t('toggleLanguage')}>
                {language === 'en' ? '繁' : 'EN'}
            </button>
            {isAuthenticated ? (
                <button onClick={handleLogout} className="pointer-events-auto px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm border border-black text-black bg-white/80 hover:bg-gray-100" aria-label={t('signOut')}>
                    {t('signOut')}
                </button>
            ) : (
                <button onClick={() => setShowAuthModal(true)} className="pointer-events-auto px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm border border-black text-white bg-black hover:bg-neutral-800" aria-label={t('signIn')}>
                    {t('signIn')}
                </button>
            )}
        </div>

        {showHelpModal && (
            <HelpModal onClose={() => setShowHelpModal(false)} />
        )}
        {showSettingsModal && (
            <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
        )}

        {photoPreviewState && (
            <PhotoPreviewModal 
                photos={photoPreviewState.photos}
                currentIndex={photoPreviewState.currentIndex}
                onClose={() => setPhotoPreviewState(null)} 
                onNext={handlePhotoPreviewNext}
                onPrevious={handlePhotoPreviewPrevious}
            />
        )}
        
        {showLogModal && selectedImage && (
            <TravelLogModal log={selectedImage.log} onSave={handleSaveLog} onClose={() => setShowLogModal(false)} />
        )}
        
        {showAuthModal && (
            <AuthModal 
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                onSuccess={handleAuthSuccess}
            />
        )}
        
        {selectedImage && mapRef.current && !selectedImage.isLocked && (
             <Toolbar
                selectedImage={selectedImage}
                map={mapRef.current}
                onRegenerate={handleRegenerateSelected}
                onFlip={handleFlipSelected}
                onDuplicate={handleDuplicateSelected}
                onScale={handleScaleSelected}
                onDelete={handleDeleteSelected}
                onEdit={handleEditSelected}
                onLock={handleLockSelected}
             />
        )}

        {selectedImage && mapRef.current && selectedImage.isLocked && (
            <MemoryCards
                selectedImage={selectedImage}
                map={mapRef.current}
                onUnlock={handleUnlockSelected}
                onViewPhoto={handleViewPhoto}
                onAddPhoto={handleAddPhotoClick}
                onEditLog={handleEditLog}
                onDeletePhoto={handleDeletePhotoFromMemory}
            />
        )}
       
        <div className="absolute bottom-2 sm:bottom-4 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 flex justify-center z-20">
            <div className="flex flex-row gap-1 sm:gap-2 p-1 sm:p-2 rounded-none w-full sm:w-auto justify-center">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="h-10 sm:h-12 flex-1 sm:flex-initial px-2 sm:px-4 py-2 sm:py-3 border border-black bg-black text-white text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 hover:bg-neutral-800 transition-colors" aria-label={t('addMemory')}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" className="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                    <span className="hidden min-[400px]:inline">{t('addMemory')}</span>
                </button>
                <button onClick={() => importInputRef.current?.click()} className="h-10 sm:h-12 flex-1 sm:flex-initial px-2 sm:px-4 py-2 sm:py-3 border border-black bg-white/80 text-black text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 hover:bg-gray-100" aria-label={t('importMap')}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" className="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path></svg>
                    <span className="hidden min-[400px]:inline">{t('importMap')}</span>
                </button>
                <button onClick={handleExport} className="h-10 sm:h-12 flex-1 sm:flex-initial px-2 sm:px-4 py-2 sm:py-3 border border-black bg-white/80 text-black text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 hover:bg-gray-100" aria-label={t('exportMap')}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" className="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                    <span className="hidden min-[400px]:inline">{t('exportMap')}</span>
                </button>
                <button onClick={() => setShowResetConfirm(true)} className="h-10 sm:h-12 flex-1 sm:flex-initial px-2 sm:px-4 py-2 sm:py-3 border border-black bg-white/80 text-black text-xs sm:text-sm flex items-center justify-center gap-1 hover:bg-gray-100" aria-label={t('resetMap')}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" className="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    <span className="hidden min-[400px]:inline">{t('reset')}</span>
                </button>
            </div>
        </div>
        {showResetConfirm && (
            <ResetConfirmModal
                onConfirm={handleResetCanvas}
                onCancel={() => setShowResetConfirm(false)}
            />
        )}
        {showImportConfirm && (
            <ImportConfirmModal
                onConfirm={confirmImport}
                onCancel={() => setShowImportConfirm(false)}
            />
        )}
    </div>
  );
};

export default App;

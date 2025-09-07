import React, { useState } from 'react';
import type { ProcessedImage } from '../App';

interface ImageMarkerProps {
    img: ProcessedImage;
    map: any;
    isSelected: boolean;
    isDragging: boolean;
    animationTick: number;
    previewImageCache: React.MutableRefObject<Record<number, HTMLImageElement>>;
    onInteractionStart: (e: React.MouseEvent<HTMLDivElement>, img: ProcessedImage) => void;
    onAddPhotoToMemory: (memoryId: number, file: File) => void;
}

const ImageMarkerComponent: React.FC<ImageMarkerProps> = ({
    img,
    map,
    isSelected,
    isDragging,
    animationTick,
    previewImageCache,
    onInteractionStart,
    onAddPhotoToMemory,
}) => {
    const screenPoint = map.latLngToContainerPoint([img.lat, img.lng]);
    const [isDragOver, setIsDragOver] = useState(false);
    
    let imageToDraw: HTMLImageElement | null = img.processedImage;
    if (img.showOriginal && img.sourceFile && img.photos[0]) {
        const cachedOriginal = Object.values(previewImageCache.current).find(cacheImg => cacheImg.src === img.photos[0].url);
        if (cachedOriginal) {
            imageToDraw = cachedOriginal;
        }
    }

    const ellipses = ['.', '..', '...'][animationTick % 3];
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        if (img.isLocked && e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            setIsDragOver(true);
        }
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        if (img.isLocked) {
            e.preventDefault();
            e.stopPropagation(); 
            setIsDragOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                onAddPhotoToMemory(img.id, e.dataTransfer.files[0]);
            }
        }
    };

    const selectionRingClass = () => {
        if (!isSelected) return '';
        if (img.isLocked) {
            return isDragOver ? 'border-solid border-green-500/80' : 'border-dashed border-gray-500/80';
        }
        return 'border-solid border-blue-500/80';
    };


    return (
        <div
            id={`image-${img.id}`}
            className={`absolute flex items-center justify-center pointer-events-auto ${isDragging ? 'z-20' : 'z-10'}`}
            style={{
                left: 0,
                top: 0,
                width: img.width,
                height: img.height,
                transform: `translate(${screenPoint.x - img.width / 2}px, ${screenPoint.y - img.height / 2}px)`,
                willChange: 'transform',
                cursor: img.isLocked ? 'pointer' : 'grab'
            }}
            onMouseDown={(e) => onInteractionStart(e, img)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {imageToDraw && !img.isGenerating && (
                <img 
                    src={imageToDraw.src} 
                    className="max-w-none"
                    style={{
                        width: '100%', height: '100%',
                        transform: img.flippedHorizontally ? 'scaleX(-1)' : 'none',
                    }}
                    draggable="false"
                />
            )}
            {img.isGenerating && (
                 <div className="absolute inset-0">
                    {img.photos[0]?.url && (
                        <img
                            src={img.photos[0].url}
                            className="w-full h-full object-cover"
                            style={{ filter: 'blur(4px)', opacity: 0.6 }}
                            draggable="false"
                        />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center text-3xl font-mono text-white" style={{ textShadow: '0 0 5px black' }}>
                        {ellipses}
                    </div>
                </div>
            )}
            {isSelected && (
                <div className={`absolute rounded-full border-2 pointer-events-none ${selectionRingClass()}`} style={{
                    width: `${Math.max(img.width, img.height) + 20}px`,
                    height: `${Math.max(img.width, img.height) + 20}px`,
                }}/>
            )}
        </div>
    );
};

export const ImageMarker = React.memo(ImageMarkerComponent);
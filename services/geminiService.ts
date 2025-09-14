import { GoogleGenAI, Modality, Type } from "@google/genai";

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // The result includes the "data:image/jpeg;base64," prefix, which we need to remove.
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
};

export const generateImageWithPrompt = async (imageFile: File, prompt: string): Promise<{ imageUrl: string | null; text: string | null; }> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("VITE_GEMINI_API_KEY environment variable not set. Please ensure it's configured in your .env file.");
    }
    const ai = new GoogleGenAI({ apiKey });

    const base64ImageData = await fileToBase64(imageFile);
    const mimeType = imageFile.type;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: base64ImageData,
                        mimeType: mimeType,
                    },
                },
                {
                    text: prompt,
                },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    
    let imageUrl: string | null = null;
    let text: string | null = null;
    
    if (response.candidates && response.candidates.length > 0) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
                const base64ImageBytes: string = part.inlineData.data;
                imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            } else if (part.text) {
                text = part.text;
            }
        }
    }

    if (!imageUrl) {
        throw new Error(text || "No image was generated in the API response.");
    }

    return { imageUrl, text };
};

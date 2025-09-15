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
    // Check if dev mode is enabled
    const devMode = (import.meta as any).env.VITE_DEV_MODE === 'true';
    if (devMode) {
        console.log('DEV MODE: Skipping Gemini API call, returning placeholder');
        // Return a placeholder image URL (you can replace with any test image)
        return {
            imageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iIzMzNzNkYyIvPjx0ZXh0IHg9IjYwIiB5PSI2MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkRFViBNT0RFPC90ZXh0Pjwvc3ZnPg==',
            text: null
        };
    }

    // Check for user's personal API key first, then fall back to environment variable
    let apiKey = localStorage.getItem('gemini_api_key');
    const usingServerKey = !apiKey;

    if (!apiKey) {
        // Fall back to environment variable
        apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("Gemini API key not found. Please provide your own API key in Settings or contact the administrator.");
        }
    }

    // If using server's API key, require authentication
    if (usingServerKey) {
        const token = localStorage.getItem('passkey_auth_token');
        if (!token) {
            throw new Error("Authentication required. Please log in to use the server's AI service, or provide your own API key in Settings.");
        }
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

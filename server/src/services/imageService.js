import fetch from 'node-fetch';
import FormData from 'form-data';

class ImageService {
  constructor() {
    this.apiKey = process.env.PICSUR_API_KEY;
    this.endpoint = process.env.PICSUR_ENDPOINT;

    if (!this.apiKey || !this.endpoint) {
      console.warn('PicSur configuration missing. Image upload will be disabled.');
    }
  }

  /**
   * Upload image to PicSur
   * @param {Buffer} imageBuffer - Image data as buffer
   * @param {string} filename - Original filename
   * @returns {Promise<string>} - Image URL
   */
  async uploadImage(imageBuffer, filename = 'image.jpg') {
    if (!this.apiKey || !this.endpoint) {
      throw new Error('PicSur not configured');
    }

    try {
      const formData = new FormData();
      formData.append('image', imageBuffer, {
        filename: filename,
        contentType: this.getMimeType(filename)
      });

      const response = await fetch(`${this.endpoint}/api/image/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Api-Key ${this.apiKey}`,
          ...formData.getHeaders()
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PicSur upload failed:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(`PicSur error: ${result.data?.message || 'Upload failed'}`);
      }

      // Return the image URL
      return result.data.url || `${this.endpoint}/i/${result.data.id}`;

    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
  }

  /**
   * Upload base64 image to PicSur
   * @param {string} base64Data - Base64 encoded image (with or without data URL prefix)
   * @param {string} filename - Original filename
   * @returns {Promise<string>} - Image URL
   */
  async uploadBase64Image(base64Data, filename = 'image.jpg') {
    // Remove data URL prefix if present
    const base64Content = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Content, 'base64');

    return this.uploadImage(imageBuffer, filename);
  }

  /**
   * Get MIME type from filename
   * @param {string} filename
   * @returns {string}
   */
  getMimeType(filename) {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'bmp': 'image/bmp'
    };
    return mimeTypes[ext] || 'image/jpeg';
  }

  /**
   * Check if PicSur is configured and available
   * @returns {boolean}
   */
  isConfigured() {
    return !!(this.apiKey && this.endpoint);
  }
}

export default new ImageService();
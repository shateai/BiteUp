import { Cloudinary } from "@cloudinary/url-gen";

const cloudName = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME;

export const cld = cloudName ? new Cloudinary({
  cloud: {
    cloudName
  }
}) : null;

/**
 * Optimizes an image URL using Cloudinary if cld is initialized.
 * If not initialized or not a Cloudinary image, returns the original URL.
 */
export const getOptimizedImageUrl = (url: string) => {
  if (!cld || !url.includes('cloudinary.com')) return url;
  
  try {
    // Basic optimization: auto format and auto quality
    return url.replace('/upload/', '/upload/f_auto,q_auto/');
  } catch (e) {
    return url;
  }
};

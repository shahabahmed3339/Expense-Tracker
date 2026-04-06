const MAX_PROFILE_IMAGE_DIMENSION = 100;
const PROFILE_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PROFILE_IMAGE_DATA_URL =
  /^data:image\/(?:jpeg|jpg|png|webp);base64,[a-z0-9+/=]+$/i;

export function isRemoteImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isProfileImageDataUrl(value: string) {
  return PROFILE_IMAGE_DATA_URL.test(value);
}

export function sanitizeProfileImage(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;

  if (isRemoteImageUrl(trimmed) || isProfileImageDataUrl(trimmed)) {
    return trimmed;
  }

  throw new Error("Profile image must be an http(s) URL or an uploaded image.");
}

export async function resizeProfileImageToDataUrl(file: File) {
  if (!PROFILE_IMAGE_MIME_TYPES.has(file.type)) {
    throw new Error("Use a PNG, JPG, or WebP image.");
  }

  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(imageUrl);
    const { width, height } = getScaledDimensions(image.width, image.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Image processing is not available in this browser.");
    }

    context.drawImage(image, 0, 0, width, height);

    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
    return canvas.toDataURL(outputType, outputType === "image/jpeg" ? 0.9 : undefined);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to read image."));
    image.src = src;
  });
}

function getScaledDimensions(width: number, height: number) {
  if (width <= MAX_PROFILE_IMAGE_DIMENSION && height <= MAX_PROFILE_IMAGE_DIMENSION) {
    return { width, height };
  }

  const ratio = Math.min(MAX_PROFILE_IMAGE_DIMENSION / width, MAX_PROFILE_IMAGE_DIMENSION / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

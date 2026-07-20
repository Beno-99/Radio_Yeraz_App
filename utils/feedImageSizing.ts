export const FEED_IMAGE_FALLBACK_ASPECT_RATIO = 4 / 3;
export const MIN_FEED_IMAGE_ASPECT_RATIO = 4 / 5;
export const MAX_FEED_IMAGE_ASPECT_RATIO = 1.91;

export const getFeedImageAspectRatio = (width: number, height: number) => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return FEED_IMAGE_FALLBACK_ASPECT_RATIO;
  }

  return Math.min(
    MAX_FEED_IMAGE_ASPECT_RATIO,
    Math.max(MIN_FEED_IMAGE_ASPECT_RATIO, width / height),
  );
};

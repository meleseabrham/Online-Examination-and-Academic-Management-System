/**
 * Converts an image path stored in the DB to a usable src URL.
 * - If the value is already a full URL (http/https), returns it directly.
 *   The axios interceptor in main.tsx will automatically replace localhost
 *   with the actual hostname when the browser opens from another device.
 * - If the value is a relative path (legacy format), it builds a URL
 *   using the current window hostname so it works on any device.
 */
export const getImageUrl = (pathOrUrl: string | null | undefined): string | null => {
    if (!pathOrUrl) return null;

    const currentHost = window.location.hostname || 'localhost';
    const backendPort = 5000;

    // If it's a full URL (http://... or https://...)
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
        try {
            const urlObj = new URL(pathOrUrl);
            return `${urlObj.protocol}//${currentHost}:${backendPort}${urlObj.pathname}`;
        } catch {
            // fallback if URL parsing fails
        }
    }

    // Relative path (e.g. /uploads/... or uploads/...)
    const cleanPath = pathOrUrl.replace(/^\//, '');
    return `http://${currentHost}:${backendPort}/${cleanPath}`;
};

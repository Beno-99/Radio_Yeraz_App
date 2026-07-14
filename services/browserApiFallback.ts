export type BrowserApiFallbackRequest = {
  timeoutMs?: number;
  url: string;
};

export type BrowserApiFallbackResponse = {
  body: string;
  contentType?: string;
  finalUrl?: string;
  status: number;
};

type BrowserApiFallbackHandler = (
  request: BrowserApiFallbackRequest,
) => Promise<BrowserApiFallbackResponse>;

let browserApiFallbackHandler: BrowserApiFallbackHandler | null = null;

export function registerBrowserApiFallbackHandler(
  handler: BrowserApiFallbackHandler,
) {
  browserApiFallbackHandler = handler;

  return () => {
    if (browserApiFallbackHandler === handler) {
      browserApiFallbackHandler = null;
    }
  };
}

export function hasBrowserApiFallbackHandler() {
  return Boolean(browserApiFallbackHandler);
}

export function fetchWithBrowserApiFallback(
  request: BrowserApiFallbackRequest,
) {
  if (!browserApiFallbackHandler) {
    return Promise.reject(new Error("Browser API fallback is not ready."));
  }

  return browserApiFallbackHandler(request);
}

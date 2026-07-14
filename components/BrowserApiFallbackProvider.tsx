import {
  registerBrowserApiFallbackHandler,
  type BrowserApiFallbackRequest,
  type BrowserApiFallbackResponse,
} from "@/services/browserApiFallback";
import { API_ORIGIN } from "@/services/mobileApi";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";

const DEFAULT_TIMEOUT_MS = 15000;
const API_HOST = (() => {
  try {
    return new URL(API_ORIGIN).host;
  } catch {
    return "api.radioyeraz.com";
  }
})();

const PROTECTION_PATTERN =
  /<!doctype html|<html[\s>]|imunify360|bot-protection|request is being verified|please wait|setTimeout\(function/i;

const COLLECT_PAGE_SCRIPT = `
(function () {
  function collect() {
    try {
      var pre = document.querySelector("pre");
      var body = "";
      if (pre && pre.innerText) {
        body = pre.innerText;
      } else if (document.body) {
        body = document.body.innerText || document.body.textContent || "";
      }

      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "api-page",
        body: body,
        contentType: document.contentType || "",
        finalUrl: String(window.location.href || "")
      }));
    } catch (error) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "api-error",
        message: error && error.message ? error.message : "Unable to read page."
      }));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(collect, 50);
      setTimeout(collect, 900);
    });
  } else {
    setTimeout(collect, 50);
    setTimeout(collect, 900);
  }
})();
true;
`;

type PendingRequest = BrowserApiFallbackRequest & {
  httpStatus?: number;
  id: string;
  reject: (error: Error) => void;
  resolve: (response: BrowserApiFallbackResponse) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

type BrowserMessage =
  | {
      body?: string;
      contentType?: string;
      finalUrl?: string;
      type: "api-page";
    }
  | {
      message?: string;
      type: "api-error";
    };

const isProtectionBody = (body: string) => PROTECTION_PATTERN.test(body);

const canParseJson = (body: string) => {
  const trimmed = body.trim();
  if (!trimmed || !/^[{[]/.test(trimmed)) return false;

  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
};

export function BrowserApiFallbackProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queueRef = useRef<PendingRequest[]>([]);
  const currentRef = useRef<PendingRequest | null>(null);
  const nextRequestIdRef = useRef(0);
  const [currentRequest, setCurrentRequest] = useState<PendingRequest | null>(
    null,
  );

  const startNextRequest = useCallback(() => {
    if (Platform.OS === "web" || currentRef.current) return;

    const nextRequest = queueRef.current.shift();
    if (!nextRequest) return;

    currentRef.current = nextRequest;
    setCurrentRequest(nextRequest);
  }, []);

  const finishCurrentRequest = useCallback(
    (
      id: string,
      result:
        | { response: BrowserApiFallbackResponse; type: "success" }
        | { error: Error; type: "error" },
    ) => {
      const current = currentRef.current;
      if (!current || current.id !== id) return;

      clearTimeout(current.timeoutId);
      currentRef.current = null;
      setCurrentRequest(null);

      if (result.type === "success") {
        current.resolve(result.response);
      } else {
        current.reject(result.error);
      }

      setTimeout(startNextRequest, 0);
    },
    [startNextRequest],
  );

  const enqueueRequest = useCallback(
    (request: BrowserApiFallbackRequest) =>
      new Promise<BrowserApiFallbackResponse>((resolve, reject) => {
        if (Platform.OS === "web") {
          reject(new Error("Browser API fallback is native-only."));
          return;
        }

        const id = `browser-api-${Date.now()}-${nextRequestIdRef.current++}`;
        const timeoutId = setTimeout(() => {
          finishCurrentRequest(id, {
            error: new Error("Browser API fallback timed out."),
            type: "error",
          });
        }, request.timeoutMs || DEFAULT_TIMEOUT_MS);

        queueRef.current.push({
          ...request,
          id,
          reject,
          resolve,
          timeoutId,
        });
        startNextRequest();
      }),
    [finishCurrentRequest, startNextRequest],
  );

  useEffect(() => {
    if (Platform.OS === "web") return undefined;

    const unregister = registerBrowserApiFallbackHandler(enqueueRequest);

    return () => {
      unregister();

      const cleanupError = new Error("Browser API fallback was closed.");
      const current = currentRef.current;
      if (current) {
        clearTimeout(current.timeoutId);
        current.reject(cleanupError);
        currentRef.current = null;
      }

      for (const request of queueRef.current) {
        clearTimeout(request.timeoutId);
        request.reject(cleanupError);
      }
      queueRef.current = [];
    };
  }, [enqueueRequest]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const current = currentRef.current;
      if (!current) return;

      let message: BrowserMessage;
      try {
        message = JSON.parse(event.nativeEvent.data) as BrowserMessage;
      } catch {
        return;
      }

      if (message.type === "api-error") {
        finishCurrentRequest(current.id, {
          error: new Error(message.message || "Unable to read API page."),
          type: "error",
        });
        return;
      }

      const body = (message.body || "").trim();
      if (!body) return;

      if (canParseJson(body)) {
        finishCurrentRequest(current.id, {
          response: {
            body,
            contentType: message.contentType,
            finalUrl: message.finalUrl,
            status: current.httpStatus || 200,
          },
          type: "success",
        });
        return;
      }

      if (isProtectionBody(body)) {
        return;
      }

      finishCurrentRequest(current.id, {
        error: new Error("The API returned an unreadable browser response."),
        type: "error",
      });
    },
    [finishCurrentRequest],
  );

  const handleLoadError = useCallback(
    (description: string) => {
      const current = currentRef.current;
      if (!current) return;

      finishCurrentRequest(current.id, {
        error: new Error(description || "Browser API request failed."),
        type: "error",
      });
    },
    [finishCurrentRequest],
  );

  const handleHttpStatus = useCallback((statusCode?: number) => {
    const current = currentRef.current;
    if (!current || !statusCode) return;
    current.httpStatus = statusCode;
  }, []);

  const shouldStartLoad = useCallback((request: { url: string }) => {
    if (!request.url || request.url === "about:blank") return true;

    try {
      return new URL(request.url).host === API_HOST;
    } catch {
      return false;
    }
  }, []);

  return (
    <View style={styles.root}>
      {children}
      {Platform.OS !== "web" && currentRequest ? (
        <WebView
          key={currentRequest.id}
          source={{ uri: currentRequest.url }}
          injectedJavaScript={COLLECT_PAGE_SCRIPT}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          originWhitelist={["https://*"]}
          onMessage={handleMessage}
          onError={(event) =>
            handleLoadError(event.nativeEvent.description || "Load failed.")
          }
          onHttpError={(event) =>
            handleHttpStatus(event.nativeEvent.statusCode)
          }
          onShouldStartLoadWithRequest={shouldStartLoad}
          pointerEvents="none"
          style={styles.webView}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  webView: {
    height: 1,
    left: -10,
    opacity: 0,
    position: "absolute",
    top: -10,
    width: 1,
  },
});

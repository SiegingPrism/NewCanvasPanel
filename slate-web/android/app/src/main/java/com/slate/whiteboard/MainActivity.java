package com.slate.whiteboard;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private int mTopDp = 24;
    private int mBottomDp = 48;

    private void injectInsets() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(() -> {
                String js = "if (typeof document !== 'undefined' && document && document.documentElement) {" +
                            "  document.documentElement.style.setProperty('--sat', '" + mTopDp + "px');" +
                            "  document.documentElement.style.setProperty('--sab', '" + mBottomDp + "px');" +
                            "}";
                getBridge().getWebView().evaluateJavascript(js, null);
            });
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(true);

        ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (v, insets) -> {
            int bottom = insets.getInsets(WindowInsetsCompat.Type.systemBars()).bottom;
            int top = insets.getInsets(WindowInsetsCompat.Type.systemBars()).top;
            float density = getResources().getDisplayMetrics().density;
            mBottomDp = density > 0 ? Math.round(bottom / density) : 48;
            mTopDp = density > 0 ? Math.round(top / density) : 24;

            injectInsets();
            return insets;
        });

        getOnBackPressedDispatcher().addCallback(this, new androidx.activity.OnBackPressedCallback(true) {
            private long mLastBackPressTime = 0;

            @Override
            public void handleOnBackPressed() {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().post(() -> {
                        String js = "(function() {" +
                                    "  if (typeof window.__handleAndroidBack === 'function') {" +
                                    "    try {" +
                                    "      return window.__handleAndroidBack() === true;" +
                                    "    } catch (e) { console.error('Back button error:', e); }" +
                                    "  }" +
                                    "  return false;" +
                                    "})();";
                        getBridge().getWebView().evaluateJavascript(js, result -> {
                            boolean handled = "true".equals(result);
                            if (!handled) {
                                long now = System.currentTimeMillis();
                                if (now - mLastBackPressTime < 2000) {
                                    finish();
                                } else {
                                    mLastBackPressTime = now;
                                    android.widget.Toast.makeText(MainActivity.this, "Press back again to exit", android.widget.Toast.LENGTH_SHORT).show();
                                }
                            }
                        });
                    });
                } else {
                    finish();
                }
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        injectInsets();
    }
}

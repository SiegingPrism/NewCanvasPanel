package com.slate.whiteboard;

import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private int mTopDp = 0;
    private int mBottomDp = 0;

    private void hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
            controller.hide(WindowInsetsCompat.Type.systemBars());
        }
    }

    private void optimizeWebView(WebView wv) {
        if (wv == null) return;
        wv.setLayerType(View.LAYER_TYPE_NONE, null);
        wv.setBackgroundColor(android.graphics.Color.WHITE);
        wv.setOverScrollMode(View.OVER_SCROLL_NEVER);
        wv.setVerticalScrollBarEnabled(false);
        wv.setHorizontalScrollBarEnabled(false);

        WebSettings settings = wv.getSettings();
        if (settings != null) {
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setOffscreenPreRaster(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        }
    }

    private void injectInsets() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView wv = getBridge().getWebView();
            optimizeWebView(wv);
            wv.post(() -> {
                String js = "if (typeof document !== 'undefined' && document && document.documentElement) {" +
                            "  document.documentElement.style.setProperty('--sat', '" + mTopDp + "px');" +
                            "  document.documentElement.style.setProperty('--sab', '" + mBottomDp + "px');" +
                            "}";
                wv.evaluateJavascript(js, null);
            });
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        setTheme(R.style.AppTheme_NoActionBar);
        super.onCreate(savedInstanceState);
        if (0 != (getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE)) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        // Hardware accelerate window explicitly
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );
        getWindow().setFormat(android.graphics.PixelFormat.OPAQUE);
        getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.WHITE));
        if (getWindow().getDecorView() != null) {
            getWindow().getDecorView().setBackgroundColor(android.graphics.Color.WHITE);
        }
        if (getBridge() != null && getBridge().getWebView() != null) {
            optimizeWebView(getBridge().getWebView());
        }
        hideSystemBars();

        ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (v, insets) -> {
            int bottom = insets.getInsets(WindowInsetsCompat.Type.systemBars()).bottom;
            int top = insets.getInsets(WindowInsetsCompat.Type.systemBars()).top;
            float density = getResources().getDisplayMetrics().density;
            int calcBottom = density > 0 ? Math.round(bottom / density) : 0;
            int calcTop = density > 0 ? Math.round(top / density) : 0;
            mBottomDp = calcBottom;
            mTopDp = calcTop;

            injectInsets();
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().postDelayed(this::injectInsets, 500);
                getBridge().getWebView().postDelayed(this::injectInsets, 1500);
            }
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
        getWindow().setFormat(android.graphics.PixelFormat.OPAQUE);
        getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.WHITE));
        if (getBridge() != null && getBridge().getWebView() != null) {
            optimizeWebView(getBridge().getWebView());
        }
        hideSystemBars();
        injectInsets();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemBars();
        }
    }
}

package com.slate.whiteboard;

import android.os.Bundle;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (v, insets) -> {
            int bottom = insets.getInsets(WindowInsetsCompat.Type.systemBars()).bottom;
            int top = insets.getInsets(WindowInsetsCompat.Type.systemBars()).top;
            float density = getResources().getDisplayMetrics().density;
            int bottomDp = density > 0 ? Math.round(bottom / density) : 0;
            int topDp = density > 0 ? Math.round(top / density) : 0;

            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().post(() -> {
                    String js = "if (typeof document !== 'undefined' && document && document.documentElement) {" +
                                "  document.documentElement.style.setProperty('--sat', '" + topDp + "px');" +
                                "  document.documentElement.style.setProperty('--sab', '" + bottomDp + "px');" +
                                "}";
                    getBridge().getWebView().evaluateJavascript(js, null);
                });
            }
            return insets;
        });
    }
}

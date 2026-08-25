package br.com.vacatio.app;

import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.ActionBar;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // Últimos insets conhecidos, em px CSS. Reinjetados a cada onPageFinished.
    private int saiTop = 0;
    private int saiRight = 0;
    private int saiBottom = 0;
    private int saiLeft = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        final Thread.UncaughtExceptionHandler defaultHandler = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((thread, ex) -> {
            try {
                android.util.Log.e("FATAL_CRASH", "Crash fatal capturado", ex);
                java.io.StringWriter sw = new java.io.StringWriter();
                ex.printStackTrace(new java.io.PrintWriter(sw));
                
                android.content.Intent intent = new android.content.Intent(this, CrashActivity.class);
                intent.putExtra("STACK_TRACE", sw.toString());
                intent.setFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK | android.content.Intent.FLAG_ACTIVITY_CLEAR_TASK);
                startActivity(intent);
                
                android.os.Process.killProcess(android.os.Process.myPid());
                System.exit(10);
            } catch (Throwable ignored) {}
            if (defaultHandler != null) {
                defaultHandler.uncaughtException(thread, ex);
            }
        });

        // O AndroidX SplashScreen gerencia a transição de tema via postSplashScreenTheme.
        // Chamar setTheme aqui antes do super.onCreate quebra o plugin SplashScreen no Android 12+.

        // Antes do super.onCreate por causa do BridgeActivity/ComponentActivity.
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);

        try {
            ActionBar actionBar = getSupportActionBar();
            if (actionBar != null) actionBar.hide();
        } catch (Throwable ignored) {}

        // Reforço explícito: garantir que o decor não come os insets.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Cutout ALWAYS (Android 11+); substitui SHORT_EDGES deprecado no 15.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS;
        }

        final WebView webView;
        try {
            webView = (WebView) getBridge().getWebView();
        } catch (Throwable t) {
            return;
        }
        if (webView == null) return;

        final float density = getResources().getDisplayMetrics().density;

        // Listener direto na WebView — é ela que efetivamente recebe os insets
        // em edge-to-edge no Capacitor.
        ViewCompat.setOnApplyWindowInsetsListener(webView, (v, insets) -> {
            Insets bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars()
                    | WindowInsetsCompat.Type.displayCutout()
            );
            saiTop = (int) (bars.top / density);
            saiRight = (int) (bars.right / density);
            saiBottom = (int) (bars.bottom / density);
            saiLeft = (int) (bars.left / density);
            injectSafeAreaCss(webView);
            // Não consumir — deixa filhos verem os insets se precisarem.
            return insets;
        });

        // Fallback: se por algum motivo o listener não disparar na WebView,
        // tentar também no content view.
        final View content = findViewById(android.R.id.content);
        if (content != null) {
            ViewCompat.setOnApplyWindowInsetsListener(content, (v, insets) -> {
                Insets bars = insets.getInsets(
                    WindowInsetsCompat.Type.systemBars()
                        | WindowInsetsCompat.Type.displayCutout()
                );
                if (saiTop == 0 && bars.top > 0) {
                    saiTop = (int) (bars.top / density);
                    saiRight = (int) (bars.right / density);
                    saiBottom = (int) (bars.bottom / density);
                    saiLeft = (int) (bars.left / density);
                    injectSafeAreaCss(webView);
                }
                return insets;
            });
        }

        // Força o primeiro dispatch de insets — sem isso, muitos aparelhos
        // só entregam o inset após rotate/foco.
        ViewCompat.requestApplyInsets(webView);

        // Belt-and-suspenders: reinjetamos o CSS var em intervalos crescentes
        // após o boot — como o JS é idempotente (só seta CSS vars), isso é
        // seguro e cobre o caso de SPA reload ou insets que chegam depois do
        // primeiro paint.
        final Handler h = new Handler(Looper.getMainLooper());
        int[] delaysMs = new int[] { 150, 500, 1200, 2500, 5000 };
        for (int d : delaysMs) {
            h.postDelayed(() -> injectSafeAreaCss(webView), d);
        }
    }

    private void injectSafeAreaCss(WebView wv) {
        if (wv == null) return;
        try {
            String js = String.format(
                "(function(){var d=document.documentElement;" +
                "if(!d)return;" +
                "var v=[%d,%d,%d,%d];" +
                "['--sai-top','--sai-right','--sai-bottom','--sai-left']" +
                ".forEach(function(k,i){d.style.setProperty(k,v[i]+'px');});" +
                "})();",
                saiTop, saiRight, saiBottom, saiLeft);
            wv.evaluateJavascript(js, null);
        } catch (Throwable ignored) {}
    }

}

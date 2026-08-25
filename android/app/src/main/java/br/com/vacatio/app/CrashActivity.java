package br.com.vacatio.app;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.widget.ScrollView;
import android.widget.TextView;

public class CrashActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        String stackTrace = getIntent().getStringExtra("STACK_TRACE");
        if (stackTrace == null) {
            stackTrace = "No stack trace provided.";
        }

        ScrollView scrollView = new ScrollView(this);
        TextView textView = new TextView(this);
        textView.setText("The app crashed!\n\nPlease take a screenshot of this and send it to the developer:\n\n" + stackTrace);
        textView.setPadding(32, 32, 32, 32);
        textView.setTextSize(14);
        textView.setTextColor(0xFF000000);
        scrollView.setBackgroundColor(0xFFFFFFFF);
        scrollView.addView(textView);

        setContentView(scrollView);
    }
}

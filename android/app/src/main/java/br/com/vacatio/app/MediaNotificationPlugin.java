package br.com.vacatio.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.SystemClock;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;

import androidx.core.app.NotificationCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "MediaNotification")
public class MediaNotificationPlugin extends Plugin {

    public static final String ACTION_PLAY = "br.com.vacatio.app.ACTION_PLAY";
    public static final String ACTION_PAUSE = "br.com.vacatio.app.ACTION_PAUSE";
    public static final String ACTION_TOGGLE = "br.com.vacatio.app.ACTION_TOGGLE";
    public static final String ACTION_NEXT = "br.com.vacatio.app.ACTION_NEXT";
    public static final String ACTION_PREV = "br.com.vacatio.app.ACTION_PREV";

    private static final String CHANNEL_ID = "audio_playback_channel";
    private static final int NOTIFICATION_ID = 777123;

    private static MediaNotificationPlugin sInstance;

    private MediaSessionCompat mMediaSession;
    private NotificationManager mNotificationManager;
    private String mLastArtworkUrl = null;
    private Bitmap mLastArtworkBitmap = null;

    private String mCurrentTitle = "Audioaula";
    private String mCurrentArtist = "Vacatio";
    private String mCurrentAlbum = "Audioaulas";
    private boolean mCurrentIsPlaying = false;
    private double mCurrentDuration = 0;
    private double mCurrentPosition = 0;
    private boolean mCanNext = true;
    private boolean mCanPrev = true;

    @Override
    public void load() {
        super.load();
        sInstance = this;
        initMediaSession();
    }

    private void initMediaSession() {
        Context context = getContext();
        if (context == null) return;

        mNotificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();

        if (mMediaSession == null) {
            mMediaSession = new MediaSessionCompat(context, "VacatioAudioSession");
            mMediaSession.setFlags(
                MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS |
                MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
            );

            mMediaSession.setCallback(new MediaSessionCompat.Callback() {
                @Override
                public void onPlay() {
                    handleNativeAction(ACTION_PLAY);
                }

                @Override
                public void onPause() {
                    handleNativeAction(ACTION_PAUSE);
                }

                @Override
                public void onSkipToNext() {
                    handleNativeAction(ACTION_NEXT);
                }

                @Override
                public void onSkipToPrevious() {
                    handleNativeAction(ACTION_PREV);
                }

                @Override
                public void onSeekTo(long posMs) {
                    JSObject ret = new JSObject();
                    ret.put("action", "seek");
                    ret.put("position", posMs / 1000.0);
                    notifyListeners("action", ret);
                }

                @Override
                public void onStop() {
                    handleNativeAction(ACTION_PAUSE);
                }
            });

            mMediaSession.setActive(true);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && mNotificationManager != null) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Reprodução de Áudio",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Controles de reprodução de áudio e áudio-aulas em segundo plano");
            channel.setShowBadge(false);
            channel.setSound(null, null);
            channel.enableVibration(false);
            mNotificationManager.createNotificationChannel(channel);
        }
    }

    @PluginMethod
    public void update(PluginCall call) {
        initMediaSession();

        mCurrentTitle = call.getString("title", mCurrentTitle);
        mCurrentArtist = call.getString("artist", mCurrentArtist);
        mCurrentAlbum = call.getString("album", mCurrentAlbum);
        mCurrentIsPlaying = Boolean.TRUE.equals(call.getBoolean("isPlaying", false));
        mCurrentDuration = call.getDouble("duration", mCurrentDuration);
        mCurrentPosition = call.getDouble("position", mCurrentPosition);
        mCanNext = Boolean.TRUE.equals(call.getBoolean("canNext", true));
        mCanPrev = Boolean.TRUE.equals(call.getBoolean("canPrev", true));

        String artworkUrl = call.getString("artworkUrl", null);

        updatePlaybackState();
        updateMetadata(artworkUrl);

        if (artworkUrl != null && !artworkUrl.equals(mLastArtworkUrl)) {
            mLastArtworkUrl = artworkUrl;
            fetchArtworkBitmap(artworkUrl);
        } else {
            renderNotification();
        }

        call.resolve();
    }

    @PluginMethod
    public void dismiss(PluginCall call) {
        mCurrentIsPlaying = false;
        if (mMediaSession != null) {
            PlaybackStateCompat.Builder stateBuilder = new PlaybackStateCompat.Builder()
                .setState(PlaybackStateCompat.STATE_STOPPED, 0, 0);
            mMediaSession.setPlaybackState(stateBuilder.build());
            mMediaSession.setActive(false);
        }
        if (mNotificationManager != null) {
            mNotificationManager.cancel(NOTIFICATION_ID);
        }
        call.resolve();
    }

    private void updatePlaybackState() {
        if (mMediaSession == null) return;

        long actions = PlaybackStateCompat.ACTION_PLAY |
                       PlaybackStateCompat.ACTION_PAUSE |
                       PlaybackStateCompat.ACTION_PLAY_PAUSE |
                       PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                       PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
                       PlaybackStateCompat.ACTION_SEEK_TO |
                       PlaybackStateCompat.ACTION_STOP;

        long positionMs = (long) (Math.max(0, mCurrentPosition) * 1000);
        float playbackSpeed = mCurrentIsPlaying ? 1.0f : 0.0f;

        PlaybackStateCompat.Builder stateBuilder = new PlaybackStateCompat.Builder()
            .setActions(actions)
            .setState(
                mCurrentIsPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
                positionMs,
                playbackSpeed,
                SystemClock.elapsedRealtime()
            );

        mMediaSession.setPlaybackState(stateBuilder.build());
        mMediaSession.setActive(true);
    }

    private void updateMetadata(String artworkUrl) {
        if (mMediaSession == null) return;

        long durationMs = (long) (Math.max(0, mCurrentDuration) * 1000);

        MediaMetadataCompat.Builder metaBuilder = new MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, mCurrentTitle)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, mCurrentArtist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, mCurrentAlbum)
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, durationMs);

        if (mLastArtworkBitmap != null) {
            metaBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, mLastArtworkBitmap);
            metaBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ART, mLastArtworkBitmap);
        }

        mMediaSession.setMetadata(metaBuilder.build());
    }

    private void fetchArtworkBitmap(final String urlString) {
        new Thread(() -> {
            Bitmap bitmap = null;
            try {
                URL url = new URL(urlString);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setDoInput(true);
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);
                conn.connect();
                InputStream input = conn.getInputStream();
                bitmap = BitmapFactory.decodeStream(input);
            } catch (Throwable ignored) {}

            mLastArtworkBitmap = bitmap;
            updateMetadata(urlString);
            renderNotification();
        }).start();
    }

    private void renderNotification() {
        Context context = getContext();
        if (context == null || mMediaSession == null || mNotificationManager == null) return;

        // Intent de toque no corpo da notificação (abre o app diretamente na audioaula)
        Intent contentIntent = new Intent(context, MainActivity.class);
        contentIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        contentIntent.putExtra("navigate_to", "/audioaulas");
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent contentPendingIntent = PendingIntent.getActivity(context, 0, contentIntent, flags);

        // Actions
        PendingIntent prevPI = createActionIntent(context, ACTION_PREV, 101);
        PendingIntent togglePI = createActionIntent(context, ACTION_TOGGLE, 102);
        PendingIntent nextPI = createActionIntent(context, ACTION_NEXT, 103);

        int playPauseIcon = mCurrentIsPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play;
        String playPauseText = mCurrentIsPlaying ? "Pausar" : "Tocar";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle(mCurrentTitle)
            .setContentText(mCurrentArtist)
            .setSubText(mCurrentAlbum)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(contentPendingIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(mCurrentIsPlaying)
            .setShowWhen(false)
            .setOnlyAlertOnce(true)
            .addAction(android.R.drawable.ic_media_previous, "Anterior", prevPI)
            .addAction(playPauseIcon, playPauseText, togglePI)
            .addAction(android.R.drawable.ic_media_next, "Próxima", nextPI);

        if (mLastArtworkBitmap != null) {
            builder.setLargeIcon(mLastArtworkBitmap);
        }

        androidx.media.app.NotificationCompat.MediaStyle mediaStyle =
            new androidx.media.app.NotificationCompat.MediaStyle()
                .setMediaSession(mMediaSession.getSessionToken())
                .setShowActionsInCompactView(0, 1, 2);

        builder.setStyle(mediaStyle);

        Notification notification = builder.build();
        mNotificationManager.notify(NOTIFICATION_ID, notification);
    }

    private PendingIntent createActionIntent(Context context, String action, int requestCode) {
        Intent intent = new Intent(context, MediaActionReceiver.class);
        intent.setAction(action);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);
        return PendingIntent.getBroadcast(context, requestCode, intent, flags);
    }

    public void handleNativeAction(String action) {
        JSObject ret = new JSObject();
        if (ACTION_PLAY.equals(action)) {
            ret.put("action", "play");
            mCurrentIsPlaying = true;
        } else if (ACTION_PAUSE.equals(action)) {
            ret.put("action", "pause");
            mCurrentIsPlaying = false;
        } else if (ACTION_TOGGLE.equals(action)) {
            ret.put("action", "toggle");
            mCurrentIsPlaying = !mCurrentIsPlaying;
        } else if (ACTION_NEXT.equals(action)) {
            ret.put("action", "next");
        } else if (ACTION_PREV.equals(action)) {
            ret.put("action", "prev");
        }
        updatePlaybackState();
        renderNotification();
        notifyListeners("action", ret);
    }

    public static class MediaActionReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent == null) return;
            String action = intent.getAction();
            if (action != null && sInstance != null) {
                sInstance.handleNativeAction(action);
            }
        }
    }
}


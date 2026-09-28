package com.dimenueveis.calendar;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

public class ScheduledNotificationReceiver extends BroadcastReceiver {

    public static final String CHANNEL_ID = "dimenueveis_feasts_channel";
    public static final String EXTRA_NOTIFICATION_ID = "extra_notification_id";
    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_BODY = "extra_body";

    public static Bitmap renderAppIconBitmap(Context context) {
        try {
            Drawable drawable = ContextCompat.getDrawable(context, R.mipmap.ic_launcher);
            if (drawable == null) return null;
            int width = drawable.getIntrinsicWidth() > 0 ? drawable.getIntrinsicWidth() : 192;
            int height = drawable.getIntrinsicHeight() > 0 ? drawable.getIntrinsicHeight() : 192;
            Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
            drawable.draw(canvas);
            return bitmap;
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;

        if (Build.VERSION.SDK_INT >= 33) {
            if (ContextCompat.checkSelfPermission(context, "android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
                return;
            }
        }

        String title = intent.getStringExtra(EXTRA_TITLE);
        String body = intent.getStringExtra(EXTRA_BODY);
        int notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, (int) (System.currentTimeMillis() & 0xfffffff));

        if (title == null || title.isEmpty()) return;

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Alertas Solares, Lunares e Festas",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notificações de Nascer do Sol, Mudança de Fase da Lua, Festas Bíblicas e Sábados");
            manager.createNotificationChannel(channel);
        }

        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent contentIntent = PendingIntent.getActivity(context, notificationId, launchIntent, flags);

        Bitmap appIconBitmap = renderAppIconBitmap(context);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_notification)
                .setColor(0xFFF59E0B)
                .setContentTitle(title)
                .setContentText(body != null ? body : "")
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body != null ? body : ""))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setContentIntent(contentIntent)
                .setAutoCancel(true);

        if (appIconBitmap != null) {
            builder.setLargeIcon(appIconBitmap);
        }

        manager.notify(notificationId, builder.build());
    }
}

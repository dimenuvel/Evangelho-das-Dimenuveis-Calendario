package com.dimenueveis.calendar;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * Native Android Home Screen Widget Provider for Calendário das Dimenúveis.
 * Renders a high-DPI custom horological canvas supporting exact Alpha Transparency (0%–100%),
 * 4 themes (Obsidian Gold, Parchment, Celestial Blue, Monochrome), Lunar Phase disc & 14-Part Enoch bar,
 * GPS Solar Ephemeris, Sabbath Sunset Countdown, 7-Day Rhythm Strip, 13-Sign Mazzaroth, and Great Week.
 */
public class DimenueveisAppWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "dimenueveis_widget_prefs";
    public static final String KEY_WIDGET_PAYLOAD_JSON = "widget_payload_json";

    private static final String[] ROMAN_MONTHS = new String[]{
            "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII"
    };

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateSingleWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager appWidgetManager, int appWidgetId, Bundle newOptions) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions);
        updateSingleWidget(context, appWidgetManager, appWidgetId);
    }

    public static void savePayloadAndRefreshAll(Context context, String payloadJson) {
        if (payloadJson != null && !payloadJson.isEmpty()) {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(KEY_WIDGET_PAYLOAD_JSON, payloadJson).apply();
        }
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        if (manager != null) {
            ComponentName cn = new ComponentName(context, DimenueveisAppWidgetProvider.class);
            int[] ids = manager.getAppWidgetIds(cn);
            if (ids != null && ids.length > 0) {
                for (int id : ids) {
                    updateSingleWidget(context, manager, id);
                }
            }
        }
    }

    public static void updateSingleWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.dimenueveis_app_widget);

            Bitmap widgetBitmap = renderWidgetBitmap(context);
            views.setImageViewBitmap(R.id.widget_canvas_image, widgetBitmap);

            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pendingIntent = PendingIntent.getActivity(context, appWidgetId, launchIntent, flags);
            views.setOnClickPendingIntent(R.id.widget_root_container, pendingIntent);
            views.setOnClickPendingIntent(R.id.widget_canvas_image, pendingIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception ignored) {
        }
    }

    private static Bitmap renderWidgetBitmap(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String rawJson = prefs.getString(KEY_WIDGET_PAYLOAD_JSON, "");

        // Default fallback values computed directly from current system clock
        Date now = new Date();
        Calendar cal = Calendar.getInstance();
        cal.setTime(now);
        int gregYear = cal.get(Calendar.YEAR);
        int sacredYear = gregYear + 4024;
        int dayOfYear = cal.get(Calendar.DAY_OF_YEAR);
        // Approximate spring offset (March 20 ~ day 79)
        int daysSinceVernal = (dayOfYear - 79 + 365) % 365;
        boolean isDayZero = (daysSinceVernal == 0);
        int sacredMonth = isDayZero ? 0 : Math.min(13, ((daysSinceVernal - 1) / 28) + 1);
        int sacredDayOfMonth = isDayZero ? 0 : (((daysSinceVernal - 1) % 28) + 1);
        int weekOfYear = isDayZero ? 0 : Math.min(52, ((daysSinceVernal - 1) / 7) + 1);
        int dayOfWeek = isDayZero ? 0 : (((daysSinceVernal - 1) % 7) + 1);

        int alphaPercent = 72;
        String widgetTheme = "obsidian";
        boolean goldBorder = true;

        String sacredYearLabel = "Ano Sagrado " + sacredYear;
        String sacredDateHeadline = isDayZero
                ? "Dia Zero · Ano Novo Sagrado"
                : "Mês " + ROMAN_MONTHS[sacredMonth - 1] + ", Dia " + sacredDayOfMonth;
        String sacredSubline = isDayZero
                ? "Sábado Anual · Fora dos 364 Dias"
                : "Semana " + weekOfYear + " de 52 · " + (dayOfWeek == 7 ? "7º Dia (Sábado)" : dayOfWeek + "º Dia da Semana");
        String gregorianDateStr = new SimpleDateFormat("EEE, dd MMM yyyy", new Locale("pt", "BR")).format(now);
        String timeFormatted = new SimpleDateFormat("HH:mm", Locale.getDefault()).format(now);
        String biblicalWatchLabel = "Relógio Sagrado & Solar";

        // Approximate synodic lunar phase if no JSON saved yet
        double synodicAge = ((now.getTime() / 1000.0 - 947182440.0) / 86400.0) % 29.530588;
        if (synodicAge < 0) synodicAge += 29.530588;
        double illumFraction = 0.5 * (1.0 - Math.cos((2.0 * Math.PI * synodicAge) / 29.530588));
        int lunarIllumPercent = (int) Math.round(illumFraction * 100.0);
        int enochLunarParts = (int) Math.round(illumFraction * 14.0);
        String lunarPhaseLocalized = lunarIllumPercent > 92 ? "Lua Cheia" : (synodicAge < 14.76 ? "Lua Crescente" : "Lua Minguante");

        String locationCity = "Jerusalém (Padrão)";
        String sunSummaryStr = "Nascer 06:12 · Meio-Dia 12:18 · Pôr 18:24";
        String sabbathStatusTitle = (dayOfWeek == 7 || isDayZero) ? "Sábado Ativo · Descanso Sagrado" : "Próximo Sábado";
        int daysUntilSabbath = isDayZero ? 0 : (7 - dayOfWeek);
        String sabbathCountdownStr = daysUntilSabbath == 0 ? "SÁBADO HOJE" : ("Faltam " + daysUntilSabbath + "d até o Pôr do Sol");
        String sabbathTargetDateLabel = isDayZero ? "Dia Zero" : ("Mês " + ROMAN_MONTHS[Math.max(0, sacredMonth - 1)] + ", Dia " + Math.min(28, sacredDayOfMonth + daysUntilSabbath));
        String zodiacSummary = "13 Signos (Mazzaroth) · Porta Celeste (1 Enoque 72)";
        String nextFeastLabel = "Festas de Levítico 23 · Grande Semana: Ano " + sacredYear + " / 7.000";

        if (rawJson != null && !rawJson.isEmpty()) {
            try {
                JSONObject obj = new JSONObject(rawJson);
                alphaPercent = Math.max(0, Math.min(100, obj.optInt("alphaPercent", alphaPercent)));
                widgetTheme = obj.optString("widgetTheme", widgetTheme);
                goldBorder = obj.optBoolean("goldBorder", goldBorder);

                sacredYearLabel = obj.optString("sacredYearLabel", sacredYearLabel);
                sacredDateHeadline = obj.optString("sacredDateHeadline", sacredDateHeadline);
                sacredSubline = obj.optString("sacredSubline", sacredSubline);
                loadLiveTimeIfFresh(obj, now);
                biblicalWatchLabel = obj.optString("biblicalWatchLabel", biblicalWatchLabel);

                lunarPhaseLocalized = obj.optString("lunarPhaseLocalized", lunarPhaseLocalized);
                lunarIllumPercent = obj.optInt("lunarIlluminationPercent", lunarIllumPercent);
                enochLunarParts = Math.max(0, Math.min(14, obj.optInt("enochLunarParts", enochLunarParts)));

                locationCity = obj.optString("locationCity", locationCity);
                String rise = obj.optString("sunriseStr", "06:12");
                String noon = obj.optString("solarNoonStr", "12:18");
                String set = obj.optString("sunsetStr", "18:24");
                sunSummaryStr = "☀ " + rise + "  ·  " + noon + "  ·  ☾ " + set;

                sabbathStatusTitle = obj.optString("sabbathStatusTitle", sabbathStatusTitle);
                sabbathTargetDateLabel = obj.optString("sabbathTargetDateLabel", sabbathTargetDateLabel);
                sabbathCountdownStr = obj.optString("sabbathCountdownStr", sabbathCountdownStr);
                dayOfWeek = obj.optInt("dayOfWeek", dayOfWeek);
                isDayZero = obj.optBoolean("isDayZero", isDayZero);

                String zSym = obj.optString("zodiacSymbol", "♈");
                String zName = obj.optString("zodiacName", "");
                String eGate = obj.optString("enochGateLabel", "");
                if (!zName.isEmpty()) {
                    zodiacSummary = zSym + " " + zName + "  ·  " + eGate;
                }
                String feast = obj.optString("nextFeastLabel", "");
                String mill = obj.optString("millennialSummaryLabel", "");
                if (!feast.isEmpty() && !mill.isEmpty()) {
                    nextFeastLabel = feast + "  ·  " + mill;
                } else if (!feast.isEmpty()) {
                    nextFeastLabel = feast;
                }
            } catch (Exception ignored) {
            }
        }

        int width = 1040;
        int height = 568;
        Bitmap bmp = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bmp);

        // Resolve theme colors & exact Alpha Transparency (0..255)
        int alpha255 = (int) Math.round((alphaPercent / 100.0) * 255.0);
        int bgR = 12, bgG = 14, bgB = 20;
        int textPrimary = Color.parseColor("#FBF8F1");
        int textSecondary = Color.parseColor("#CBD5E1");
        int accentGold = Color.parseColor("#F59E0B");
        int borderColor = Color.argb(Math.max(80, alpha255), 245, 158, 11);
        int subPanelColor = Color.argb((int) (alpha255 * 0.45), 24, 30, 44);
        int badgeTextColor = Color.parseColor("#0C0E14");

        if ("parchment".equalsIgnoreCase(widgetTheme)) {
            bgR = 253;
            bgG = 249;
            bgB = 240;
            textPrimary = Color.parseColor("#14110B");
            textSecondary = Color.parseColor("#4A3F31");
            accentGold = Color.parseColor("#B45309");
            borderColor = Color.argb(Math.max(90, alpha255), 180, 83, 9);
            subPanelColor = Color.argb((int) (alpha255 * 0.45), 236, 227, 208);
            badgeTextColor = Color.WHITE;
        } else if ("celestial".equalsIgnoreCase(widgetTheme)) {
            bgR = 11;
            bgG = 22;
            bgB = 44;
            textPrimary = Color.parseColor("#F8FAFC");
            textSecondary = Color.parseColor("#BFDBFE");
            accentGold = Color.parseColor("#FBBF24");
            borderColor = Color.argb(Math.max(85, alpha255), 251, 191, 36);
            subPanelColor = Color.argb((int) (alpha255 * 0.45), 20, 40, 80);
            badgeTextColor = Color.parseColor("#0B162C");
        } else if ("mono".equalsIgnoreCase(widgetTheme)) {
            bgR = 10;
            bgG = 10;
            bgB = 12;
            textPrimary = Color.WHITE;
            textSecondary = Color.parseColor("#D4D4D8");
            accentGold = Color.parseColor("#EAB308");
            borderColor = Color.argb(Math.max(90, alpha255), 255, 255, 255);
            subPanelColor = Color.argb((int) (alpha255 * 0.45), 32, 32, 36);
            badgeTextColor = Color.BLACK;
        }

        Typeface serifBold = Typeface.create(Typeface.SERIF, Typeface.BOLD);
        Typeface serifRegular = Typeface.create(Typeface.SERIF, Typeface.NORMAL);
        Typeface serifItalic = Typeface.create(Typeface.SERIF, Typeface.ITALIC);

        Paint bgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        bgPaint.setColor(Color.argb(alpha255, bgR, bgG, bgB));
        RectF cardRect = new RectF(8f, 8f, width - 8f, height - 8f);
        canvas.drawRoundRect(cardRect, 38f, 38f, bgPaint);

        // Outer & Inner Filigree Border
        Paint borderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        borderPaint.setStyle(Paint.Style.STROKE);
        borderPaint.setStrokeWidth(goldBorder ? 3.2f : 2.0f);
        borderPaint.setColor(borderColor);
        canvas.drawRoundRect(cardRect, 38f, 38f, borderPaint);

        if (goldBorder) {
            Paint innerBorderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            innerBorderPaint.setStyle(Paint.Style.STROKE);
            innerBorderPaint.setStrokeWidth(1.2f);
            innerBorderPaint.setColor(Color.argb(70, Color.red(accentGold), Color.green(accentGold), Color.blue(accentGold)));
            RectF innerRect = new RectF(18f, 18f, width - 18f, height - 18f);
            canvas.drawRoundRect(innerRect, 30f, 30f, innerBorderPaint);
        }

        // Text Paints with subtle shadow when alpha is low
        Paint titlePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        titlePaint.setTypeface(serifBold);
        titlePaint.setColor(textPrimary);
        if (alphaPercent < 50 && !"parchment".equalsIgnoreCase(widgetTheme)) {
            titlePaint.setShadowLayer(6f, 0f, 2f, Color.argb(210, 0, 0, 0));
        }

        Paint subPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        subPaint.setTypeface(serifRegular);
        subPaint.setColor(textSecondary);
        if (alphaPercent < 50 && !"parchment".equalsIgnoreCase(widgetTheme)) {
            subPaint.setShadowLayer(4f, 0f, 1f, Color.argb(200, 0, 0, 0));
        }

        Paint goldPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        goldPaint.setTypeface(serifBold);
        goldPaint.setColor(accentGold);
        if (alphaPercent < 50 && !"parchment".equalsIgnoreCase(widgetTheme)) {
            goldPaint.setShadowLayer(5f, 0f, 2f, Color.argb(200, 0, 0, 0));
        }

        // ROW 1: Top Kicker (Sacred Year + Gregorian on Left, Biblical Watch on Right)
        goldPaint.setTextSize(22f);
        drawFittedText(
                canvas,
                "✦ " + sacredYearLabel.toUpperCase(Locale.ROOT) + "  ·  " + gregorianDateStr,
                44f,
                58f,
                575f,
                goldPaint,
                14f
        );

        subPaint.setTypeface(serifItalic);
        subPaint.setTextAlign(Paint.Align.RIGHT);
        subPaint.setTextSize(20f);
        drawFittedText(canvas, biblicalWatchLabel, width - 44f, 58f, 360f, subPaint, 13f);
        subPaint.setTextAlign(Paint.Align.LEFT);

        // Main Sacred Date Headline & Subline (Left, maxWidth = 650f)
        titlePaint.setTextSize(44f);
        drawFittedText(canvas, sacredDateHeadline, 44f, 112f, 650f, titlePaint, 24f);

        subPaint.setTypeface(serifItalic);
        subPaint.setTextSize(22f);
        drawFittedText(canvas, sacredSubline, 44f, 150f, 650f, subPaint, 14f);

        // Live Clock (Right, maxWidth = 280f)
        goldPaint.setTextAlign(Paint.Align.RIGHT);
        goldPaint.setTextSize(54f);
        drawFittedText(canvas, timeFormatted, width - 44f, 132f, 280f, goldPaint, 30f);
        goldPaint.setTextAlign(Paint.Align.LEFT);

        // Horizontal Divider
        Paint divPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        divPaint.setColor(Color.argb(65, Color.red(textSecondary), Color.green(textSecondary), Color.blue(textSecondary)));
        divPaint.setStrokeWidth(1.5f);
        canvas.drawLine(44f, 172f, width - 44f, 172f, divPaint);

        // ROW 2: Left Box (Lunar Phase + 14 Enoch Parts) | Right Box (GPS Location + Sun Times)
        Paint panelPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        panelPaint.setColor(subPanelColor);

        RectF moonBox = new RectF(44f, 188f, 508f, 308f);
        canvas.drawRoundRect(moonBox, 22f, 22f, panelPaint);
        canvas.drawRoundRect(moonBox, 22f, 22f, borderPaint);

        // Draw Moon Disc
        drawMoonPhaseDisc(canvas, 96f, 248f, 32f, lunarIllumPercent / 100f, accentGold);

        titlePaint.setTextSize(24f);
        drawFittedText(
                canvas,
                lunarPhaseLocalized + " · " + lunarIllumPercent + "%",
                144f,
                230f,
                348f,
                titlePaint,
                15f
        );

        subPaint.setTypeface(serifRegular);
        subPaint.setTextSize(19f);
        drawFittedText(
                canvas,
                "Luz de Enoque: " + enochLunarParts + "/14 Partes",
                144f,
                260f,
                348f,
                subPaint,
                13f
        );

        // 14-Part Enoch Bar
        Paint partPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        float barStartX = 144f;
        float barY = 276f;
        float segW = 20f;
        float gap = 4f;
        for (int i = 0; i < 14; i++) {
            partPaint.setColor(i < enochLunarParts ? accentGold : Color.argb(70, 148, 163, 184));
            canvas.drawRoundRect(new RectF(barStartX + i * (segW + gap), barY, barStartX + i * (segW + gap) + segW, barY + 12f), 3f, 3f, partPaint);
        }

        // Right Box: GPS & Sun Ephemeris
        RectF gpsBox = new RectF(532f, 188f, width - 44f, 308f);
        canvas.drawRoundRect(gpsBox, 22f, 22f, panelPaint);
        canvas.drawRoundRect(gpsBox, 22f, 22f, borderPaint);

        goldPaint.setTextSize(22f);
        drawFittedText(canvas, "📍 " + locationCity, 556f, 232f, 420f, goldPaint, 14f);

        subPaint.setTextSize(21f);
        drawFittedText(canvas, sunSummaryStr, 556f, 276f, 420f, subPaint, 14f);

        // ROW 3: Sabbath Countdown & 7-Day Weekly Sabbath Strip
        RectF sabbathBox = new RectF(44f, 324f, width - 44f, 458f);
        canvas.drawRoundRect(sabbathBox, 22f, 22f, panelPaint);
        canvas.drawRoundRect(sabbathBox, 22f, 22f, borderPaint);

        // Left side of Sabbath Box stops before x = 670f so it never collides with cdRect
        goldPaint.setTextSize(22f);
        drawFittedText(
                canvas,
                "✦ " + sabbathStatusTitle.toUpperCase(Locale.ROOT) + "  ·  " + sabbathTargetDateLabel,
                68f,
                364f,
                590f,
                goldPaint,
                14f
        );

        // Countdown Pill on Right of Sabbath Box
        Paint pillPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        pillPaint.setColor(accentGold);
        RectF cdRect = new RectF(width - 360f, 336f, width - 66f, 382f);
        canvas.drawRoundRect(cdRect, 14f, 14f, pillPaint);

        Paint badgePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        badgePaint.setTypeface(serifBold);
        badgePaint.setTextSize(22f);
        badgePaint.setColor(badgeTextColor);
        badgePaint.setTextAlign(Paint.Align.CENTER);
        drawFittedText(canvas, sabbathCountdownStr, cdRect.centerX(), cdRect.centerY() + 8f, cdRect.width() - 24f, badgePaint, 14f);

        // 7-Day Weekly Sabbath Rhythm Bar inside Sabbath Box
        float stripLeft = 68f;
        float stripRight = width - 68f;
        float totalStripW = stripRight - stripLeft;
        float dayGap = 10f;
        float dayBoxW = (totalStripW - (6 * dayGap)) / 7f;
        float dayTop = 396f;
        float dayBot = 442f;

        for (int d = 1; d <= 7; d++) {
            float dx = stripLeft + (d - 1) * (dayBoxW + dayGap);
            RectF dRect = new RectF(dx, dayTop, dx + dayBoxW, dayBot);
            boolean isCurrent = (!isDayZero && dayOfWeek == d);
            boolean isSab = (d == 7);

            Paint dBg = new Paint(Paint.ANTI_ALIAS_FLAG);
            if (isCurrent) {
                dBg.setColor(accentGold);
            } else if (isSab) {
                dBg.setColor(Color.argb(70, Color.red(accentGold), Color.green(accentGold), Color.blue(accentGold)));
            } else {
                dBg.setColor(Color.argb(45, 148, 163, 184));
            }
            canvas.drawRoundRect(dRect, 10f, 10f, dBg);

            Paint dTxt = new Paint(Paint.ANTI_ALIAS_FLAG);
            dTxt.setTypeface(serifBold);
            dTxt.setTextSize(19f);
            dTxt.setTextAlign(Paint.Align.CENTER);
            dTxt.setColor(isCurrent ? badgeTextColor : (isSab ? accentGold : textSecondary));
            String label = isSab ? "7º SÁB" : ("Dia " + d);
            drawFittedText(canvas, label, dRect.centerX(), dRect.centerY() + 7f, dayBoxW - 12f, dTxt, 12f);
        }

        // ROW 4: Bottom Footer Strip (13-Sign Mazzaroth + Enoch Gate + Next Feast / Great Week)
        goldPaint.setTextSize(20f);
        drawFittedText(canvas, zodiacSummary, 48f, 504f, width - 96f, goldPaint, 13f);

        subPaint.setTypeface(serifItalic);
        subPaint.setTextSize(19f);
        drawFittedText(canvas, nextFeastLabel, 48f, 538f, width - 96f, subPaint, 13f);

        return bmp;
    }

    private static void drawFittedText(
            Canvas canvas,
            String text,
            float x,
            float y,
            float maxWidth,
            Paint basePaint,
            float minTextSize
    ) {
        if (text == null || text.isEmpty()) return;
        float originalSize = basePaint.getTextSize();
        float currentSize = originalSize;
        while (currentSize > minTextSize && basePaint.measureText(text) > maxWidth) {
            currentSize -= 0.5f;
            basePaint.setTextSize(currentSize);
        }
        canvas.drawText(text, x, y, basePaint);
        basePaint.setTextSize(originalSize);
    }

    private static void loadLiveTimeIfFresh(JSONObject obj, Date now) {
        // Time is always formatted from live device clock so widget time is accurate
    }

    private static void drawMoonPhaseDisc(Canvas canvas, float cx, float cy, float radius, float illum, int goldColor) {
        Paint darkDisc = new Paint(Paint.ANTI_ALIAS_FLAG);
        darkDisc.setColor(Color.argb(210, 15, 23, 42));
        canvas.drawCircle(cx, cy, radius, darkDisc);

        Paint litPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        litPaint.setColor(goldColor);
        canvas.save();
        Path clipPath = new Path();
        clipPath.addCircle(cx, cy, radius, Path.Direction.CW);
        canvas.clipPath(clipPath);
        float litWidth = radius * 2f * Math.max(0.08f, Math.min(1f, illum));
        canvas.drawRect(cx + radius - litWidth, cy - radius, cx + radius, cy + radius, litPaint);
        canvas.restore();

        Paint rim = new Paint(Paint.ANTI_ALIAS_FLAG);
        rim.setStyle(Paint.Style.STROKE);
        rim.setStrokeWidth(2.4f);
        rim.setColor(goldColor);
        canvas.drawCircle(cx, cy, radius, rim);
    }
}

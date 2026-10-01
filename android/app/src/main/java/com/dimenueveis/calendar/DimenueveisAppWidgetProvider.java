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
 * Renders a tall, multi-row vertical horological canvas matching the Studio preview:
 * Row 1: Sacred Year + Civil Date + Solar/Night Watch + Sacred Date Headline + Subline + Live Clock
 * Row 2: Lunar Phase Disc + Illumination + 14-Part Enoch Bar | GPS City + Coordinates + Sun Ephemeris
 * Row 3: Sabbath Sunset Countdown + 2-Line Stacked 7-Day Weekly Sabbath Rhythm Strip
 * Row 4: 13-Sign Mazzaroth & 1 Enoch Celestial Gate | Next Appointed Feast (Leviticus 23)
 * Row 5: 7,000-Year Millennial Clock Progress Bar + Daily Scriptural Watchword Verse
 */
public class DimenueveisAppWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "dimenueveis_widget_prefs";
    public static final String KEY_WIDGET_PAYLOAD_JSON = "widget_payload_json";

    private static final String[] ROMAN_MONTHS = new String[]{
            "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII"
    };

    private static final String[] DEFAULT_MONTH_NAMES_PT = new String[]{
            "Primaveral", " Segundo", "Terceiro", "Quarto", "Quinto", "Sextil",
            "Setimial", "Oitavial", "Novenal", "Decimial", "Undecimial", "Duodecimial", "Décimo Terceiro"
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

        // Default fallback values computed from current system clock
        Date now = new Date();
        Calendar cal = Calendar.getInstance();
        cal.setTime(now);
        int gregYear = cal.get(Calendar.YEAR);
        int sacredYear = gregYear + 4025;
        int dayOfYear = cal.get(Calendar.DAY_OF_YEAR);
        int daysSinceVernal = (dayOfYear - 79 + 365) % 365;
        boolean isDayZero = (daysSinceVernal == 0);
        int sacredMonth = isDayZero ? 0 : Math.min(13, ((daysSinceVernal - 1) / 28) + 1);
        int sacredDayOfMonth = isDayZero ? 0 : (((daysSinceVernal - 1) % 28) + 1);
        int weekOfYear = isDayZero ? 0 : Math.min(52, ((daysSinceVernal - 1) / 7) + 1);
        int dayOfWeek = isDayZero ? 0 : (((daysSinceVernal - 1) % 7) + 1);

        int alphaPercent = 72;
        String widgetTheme = "obsidian";
        String widgetSize = "4x4";
        boolean goldBorder = true;

        boolean showGpsAndSunTimes = true;
        boolean showSabbathCountdown = true;
        boolean showWeeklySabbathBar = true;
        boolean showZodiacAndEnochGate = true;
        boolean showNextFeast = true;
        boolean showMillennialClock = true;
        boolean showDailyVerse = true;

        String sacredYearLabel = "Ano Sagrado " + sacredYear;
        String sacredDateHeadline = isDayZero
                ? "Dia Zero · Ano Novo Sagrado"
                : "Mês " + ROMAN_MONTHS[sacredMonth - 1] + " · " + DEFAULT_MONTH_NAMES_PT[sacredMonth - 1].trim() + ", Dia " + sacredDayOfMonth;
        String sacredSubline = isDayZero
                ? "Sábado Anual · Fora dos 364 Dias Numerados"
                : "Semana " + weekOfYear + " de 52 · " + (dayOfWeek == 7 ? "7º Dia (Sábado Semanal)" : dayOfWeek + "º Dia da Semana") + " · Dia " + daysSinceVernal + "/364";
        String gregorianDateStr = new SimpleDateFormat("EEE, dd MMM yyyy", new Locale("pt", "BR")).format(now);
        String timeFormatted = new SimpleDateFormat("HH:mm", Locale.getDefault()).format(now);
        String ampmSuffix = "";
        String biblicalWatchLabel = "Relógio Sagrado & Vigília Solar";

        double synodicAge = ((now.getTime() / 1000.0 - 947182440.0) / 86400.0) % 29.530588;
        if (synodicAge < 0) synodicAge += 29.530588;
        double illumFraction = 0.5 * (1.0 - Math.cos((2.0 * Math.PI * synodicAge) / 29.530588));
        int lunarIllumPercent = (int) Math.round(illumFraction * 100.0);
        int enochLunarParts = (int) Math.round(illumFraction * 14.0);
        String lunarAgeDays = String.format(Locale.US, "%.1fd", synodicAge);
        String lunarPhaseLocalized = lunarIllumPercent > 92 ? "Lua Cheia" : (synodicAge < 14.76 ? "Lua Crescente" : "Lua Minguante");
        String enochLunarPartsLabel = "Luz de Enoque: " + enochLunarParts + "/14 Partes";

        String locationCity = "Jerusalém (Padrão)";
        String coordinatesFormatted = "31.77°N, 35.21°E";
        String sunriseStr = "06:12";
        String solarNoonStr = "12:18";
        String sunsetStr = "18:24";

        boolean isSabbathActive = (dayOfWeek == 7 || isDayZero);
        String sabbathStatusTitle = isSabbathActive ? "Sábado Ativo · Descanso Sagrado" : "Próximo Sábado";
        int daysUntilSabbath = isDayZero ? 0 : (7 - dayOfWeek);
        String sabbathCountdownStr = daysUntilSabbath == 0 ? "SÁBADO HOJE" : (daysUntilSabbath + "d até o Pôr do Sol");
        String sabbathTargetDateLabel = isDayZero
                ? "Dia Zero"
                : ("Mês " + ROMAN_MONTHS[Math.max(0, sacredMonth - 1)] + ", Dia " + Math.min(28, sacredDayOfMonth + daysUntilSabbath));
        String sabbathSunsetLabel = isSabbathActive
                ? "Término ao Pôr do Sol (" + sunsetStr + ")"
                : "Início ao Pôr do Sol (" + sunsetStr + ")";

        String zodiacSymbol = "♎";
        String zodiacName = "Mazzaroth (13 Signos)";
        String zodiacArchetype = "Ordem Eclíptica";
        String enochGateLabel = "Porta Celeste 4 (1 Enoque 72)";
        String enochDayNightRatioLabel = "Dia 9/18 · Noite 9/18";

        String nextFeastLabel = "Solenidades de Levítico 23";
        int elapsedYears = sacredYear;
        double millennialProgressPercent = Math.min(100.0, Math.max(0.0, (elapsedYears / 7000.0) * 100.0));
        String millennialSummaryLabel = "Grande Semana: Ano " + elapsedYears + " / 7.000 (7º Milênio)";

        String dailyVerseRef = "Salmos 104:19";
        String dailyVerseQuote = "Designou a lua para marcar as estações; o sol conhece o seu ocaso.";

        if (rawJson != null && !rawJson.isEmpty()) {
            try {
                JSONObject obj = new JSONObject(rawJson);
                alphaPercent = Math.max(0, Math.min(100, obj.optInt("alphaPercent", alphaPercent)));
                widgetTheme = obj.optString("widgetTheme", widgetTheme);
                widgetSize = obj.optString("widgetSize", widgetSize);
                goldBorder = obj.optBoolean("goldBorder", goldBorder);

                JSONObject cfg = obj.optJSONObject("config");
                if (cfg != null) {
                    showGpsAndSunTimes = cfg.optBoolean("showGpsAndSunTimes", true);
                    showSabbathCountdown = cfg.optBoolean("showSabbathCountdown", true);
                    showWeeklySabbathBar = cfg.optBoolean("showWeeklySabbathBar", true);
                    showZodiacAndEnochGate = cfg.optBoolean("showZodiacAndEnochGate", true);
                    showNextFeast = cfg.optBoolean("showNextFeast", true);
                    showMillennialClock = cfg.optBoolean("showMillennialClock", true);
                    showDailyVerse = cfg.optBoolean("showDailyVerse", true);

                    boolean use24 = cfg.optBoolean("use24HourFormat", true);
                    boolean showSec = cfg.optBoolean("showSeconds", false);
                    if (use24) {
                        timeFormatted = new SimpleDateFormat(showSec ? "HH:mm:ss" : "HH:mm", Locale.getDefault()).format(now);
                        ampmSuffix = "";
                    } else {
                        timeFormatted = new SimpleDateFormat(showSec ? "hh:mm:ss" : "hh:mm", Locale.getDefault()).format(now);
                        ampmSuffix = cal.get(Calendar.AM_PM) == Calendar.PM ? "PM" : "AM";
                    }
                }

                sacredYearLabel = obj.optString("sacredYearLabel", sacredYearLabel);
                sacredDateHeadline = obj.optString("sacredDateHeadline", sacredDateHeadline);
                sacredSubline = obj.optString("sacredSubline", sacredSubline);
                gregorianDateStr = obj.optString("gregorianDateStr", gregorianDateStr);
                biblicalWatchLabel = obj.optString("biblicalWatchLabel", biblicalWatchLabel);

                lunarPhaseLocalized = obj.optString("lunarPhaseLocalized", lunarPhaseLocalized);
                lunarIllumPercent = obj.optInt("lunarIlluminationPercent", lunarIllumPercent);
                lunarAgeDays = obj.optString("lunarAgeDays", lunarAgeDays);
                enochLunarParts = Math.max(0, Math.min(14, obj.optInt("enochLunarParts", enochLunarParts)));
                enochLunarPartsLabel = obj.optString("enochLunarPartsLabel", enochLunarPartsLabel);

                locationCity = obj.optString("locationCity", locationCity);
                coordinatesFormatted = obj.optString("coordinatesFormatted", coordinatesFormatted);
                sunriseStr = obj.optString("sunriseStr", sunriseStr);
                solarNoonStr = obj.optString("solarNoonStr", solarNoonStr);
                sunsetStr = obj.optString("sunsetStr", sunsetStr);

                isSabbathActive = obj.optBoolean("isSabbathActive", isSabbathActive);
                sabbathStatusTitle = obj.optString("sabbathStatusTitle", sabbathStatusTitle);
                sabbathTargetDateLabel = obj.optString("sabbathTargetDateLabel", sabbathTargetDateLabel);
                sabbathSunsetLabel = obj.optString("sabbathSunsetLabel", sabbathSunsetLabel);
                sabbathCountdownStr = obj.optString("sabbathCountdownStr", sabbathCountdownStr);
                dayOfWeek = obj.optInt("dayOfWeek", dayOfWeek);
                isDayZero = obj.optBoolean("isDayZero", isDayZero);

                zodiacSymbol = obj.optString("zodiacSymbol", zodiacSymbol);
                zodiacName = obj.optString("zodiacName", zodiacName);
                zodiacArchetype = obj.optString("zodiacArchetype", zodiacArchetype);
                enochGateLabel = obj.optString("enochGateLabel", enochGateLabel);
                enochDayNightRatioLabel = obj.optString("enochDayNightRatioLabel", enochDayNightRatioLabel);

                nextFeastLabel = obj.optString("nextFeastLabel", nextFeastLabel);
                millennialProgressPercent = obj.optDouble("millennialProgressPercent", millennialProgressPercent);
                millennialSummaryLabel = obj.optString("millennialSummaryLabel", millennialSummaryLabel);

                dailyVerseRef = obj.optString("dailyVerseRef", dailyVerseRef);
                dailyVerseQuote = obj.optString("dailyVerseQuote", dailyVerseQuote);
            } catch (Exception ignored) {
            }
        }

        // Determine active vertical rows so the widget has a tall, multi-row vertical layout matching the Studio
        boolean renderRow3 = showSabbathCountdown;
        boolean renderRow4 = !"4x2".equalsIgnoreCase(widgetSize) && (showZodiacAndEnochGate || showNextFeast);
        boolean renderMillennial = "4x4".equalsIgnoreCase(widgetSize) && showMillennialClock;
        boolean renderVerse = "4x4".equalsIgnoreCase(widgetSize) && showDailyVerse;

        int width = 960;
        float curY = 44f;
        // Calculate total dynamic canvas height
        float estimatedHeight = 44f; // top padding
        estimatedHeight += 146f; // Row 1 (Header + Date + Clock)
        estimatedHeight += 172f; // Row 2 (Lunar Phase & 14-Part Bar | GPS & Solar Ephemeris)
        if (renderRow3) {
            estimatedHeight += (showWeeklySabbathBar ? 202f : 114f);
        }
        if (renderRow4) {
            estimatedHeight += 130f;
        }
        if (renderMillennial) {
            estimatedHeight += 106f;
        }
        if (renderVerse) {
            estimatedHeight += 116f;
        }
        estimatedHeight += 36f; // bottom padding

        int height = Math.max(540, Math.round(estimatedHeight));
        Bitmap bmp = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bmp);

        // Resolve theme colors & exact Alpha Transparency (0..255)
        int alpha255 = (int) Math.round((alphaPercent / 100.0) * 255.0);
        int bgR = 12, bgG = 14, bgB = 20;
        int textPrimary = Color.parseColor("#FBF8F1");
        int textSecondary = Color.parseColor("#CBD5E1");
        int textMuted = Color.parseColor("#94A3B8");
        int accentGold = Color.parseColor("#F59E0B");
        int borderColor = Color.argb(Math.max(95, alpha255), 245, 158, 11);
        int subtleBorderColor = Color.argb(Math.max(55, (int) (alpha255 * 0.45)), 148, 163, 184);
        int subPanelColor = Color.argb(Math.max(30, (int) (alpha255 * 0.48)), 24, 30, 44);
        int sabbathPanelColor = isSabbathActive
                ? Color.argb(Math.max(55, (int) (alpha255 * 0.55)), 120, 53, 15)
                : Color.argb(Math.max(45, (int) (alpha255 * 0.55)), 15, 23, 42);
        int badgeTextColor = Color.parseColor("#0C0E14");

        if ("parchment".equalsIgnoreCase(widgetTheme)) {
            bgR = 253;
            bgG = 249;
            bgB = 240;
            textPrimary = Color.parseColor("#14110B");
            textSecondary = Color.parseColor("#292318");
            textMuted = Color.parseColor("#574C3A");
            accentGold = Color.parseColor("#B45309");
            borderColor = Color.argb(Math.max(105, alpha255), 180, 83, 9);
            subtleBorderColor = Color.argb(Math.max(60, (int) (alpha255 * 0.45)), 120, 100, 75);
            subPanelColor = Color.argb(Math.max(35, (int) (alpha255 * 0.5)), 236, 227, 208);
            sabbathPanelColor = Color.argb(Math.max(50, (int) (alpha255 * 0.6)), 245, 235, 210);
            badgeTextColor = Color.WHITE;
        } else if ("celestial".equalsIgnoreCase(widgetTheme)) {
            bgR = 11;
            bgG = 22;
            bgB = 44;
            textPrimary = Color.parseColor("#F8FAFC");
            textSecondary = Color.parseColor("#DBEAFE");
            textMuted = Color.parseColor("#93C5FD");
            accentGold = Color.parseColor("#FBBF24");
            borderColor = Color.argb(Math.max(95, alpha255), 251, 191, 36);
            subtleBorderColor = Color.argb(Math.max(60, (int) (alpha255 * 0.45)), 147, 197, 253);
            subPanelColor = Color.argb(Math.max(35, (int) (alpha255 * 0.48)), 20, 40, 80);
            sabbathPanelColor = Color.argb(Math.max(50, (int) (alpha255 * 0.55)), 15, 30, 65);
            badgeTextColor = Color.parseColor("#0B162C");
        } else if ("mono".equalsIgnoreCase(widgetTheme)) {
            bgR = 10;
            bgG = 10;
            bgB = 12;
            textPrimary = Color.WHITE;
            textSecondary = Color.parseColor("#E4E4E7");
            textMuted = Color.parseColor("#A1A1AA");
            accentGold = Color.parseColor("#EAB308");
            borderColor = Color.argb(Math.max(105, alpha255), 255, 255, 255);
            subtleBorderColor = Color.argb(Math.max(65, (int) (alpha255 * 0.45)), 200, 200, 210);
            subPanelColor = Color.argb(Math.max(35, (int) (alpha255 * 0.48)), 32, 32, 36);
            sabbathPanelColor = Color.argb(Math.max(50, (int) (alpha255 * 0.58)), 24, 24, 28);
            badgeTextColor = Color.BLACK;
        }

        Typeface serifBold = Typeface.create(Typeface.SERIF, Typeface.BOLD);
        Typeface serifRegular = Typeface.create(Typeface.SERIF, Typeface.NORMAL);
        Typeface serifItalic = Typeface.create(Typeface.SERIF, Typeface.ITALIC);

        // Main Translucent Surface Card
        Paint bgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        bgPaint.setColor(Color.argb(alpha255, bgR, bgG, bgB));
        RectF cardRect = new RectF(10f, 10f, width - 10f, height - 10f);
        canvas.drawRoundRect(cardRect, 40f, 40f, bgPaint);

        // Outer & Inner Filigree Border
        Paint borderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        borderPaint.setStyle(Paint.Style.STROKE);
        borderPaint.setStrokeWidth(goldBorder ? 3.2f : 2.0f);
        borderPaint.setColor(goldBorder ? borderColor : subtleBorderColor);
        canvas.drawRoundRect(cardRect, 40f, 40f, borderPaint);

        Paint subtleBorderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        subtleBorderPaint.setStyle(Paint.Style.STROKE);
        subtleBorderPaint.setStrokeWidth(1.5f);
        subtleBorderPaint.setColor(subtleBorderColor);

        if (goldBorder) {
            RectF innerRect = new RectF(20f, 20f, width - 20f, height - 20f);
            canvas.drawRoundRect(innerRect, 32f, 32f, subtleBorderPaint);
        }

        // Typography Paints
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

        Paint mutedPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        mutedPaint.setTypeface(serifRegular);
        mutedPaint.setColor(textMuted);

        Paint goldPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        goldPaint.setTypeface(serifBold);
        goldPaint.setColor(accentGold);
        if (alphaPercent < 50 && !"parchment".equalsIgnoreCase(widgetTheme)) {
            goldPaint.setShadowLayer(5f, 0f, 2f, Color.argb(200, 0, 0, 0));
        }

        Paint panelPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        panelPaint.setColor(subPanelColor);

        // =====================================================================
        // ROW 1: Top Kicker + Sacred Date Headline & Subline + Live Clock
        // =====================================================================
        goldPaint.setTextSize(21f);
        drawFittedText(
                canvas,
                "✦ " + sacredYearLabel.toUpperCase(Locale.ROOT) + "  ·  " + gregorianDateStr,
                44f,
                curY + 20f,
                530f,
                goldPaint,
                13f
        );

        subPaint.setTypeface(serifItalic);
        subPaint.setTextAlign(Paint.Align.RIGHT);
        subPaint.setTextSize(19f);
        drawFittedText(canvas, biblicalWatchLabel, width - 44f, curY + 20f, 320f, subPaint, 13f);
        subPaint.setTextAlign(Paint.Align.LEFT);

        titlePaint.setTextSize(42f);
        drawFittedText(canvas, sacredDateHeadline, 44f, curY + 74f, 590f, titlePaint, 22f);

        subPaint.setTypeface(serifItalic);
        subPaint.setTextSize(21f);
        drawFittedText(canvas, sacredSubline, 44f, curY + 112f, 590f, subPaint, 14f);

        String fullClockText = ampmSuffix.isEmpty() ? timeFormatted : (timeFormatted + " " + ampmSuffix);
        goldPaint.setTextAlign(Paint.Align.RIGHT);
        goldPaint.setTextSize(52f);
        drawFittedText(canvas, fullClockText, width - 44f, curY + 94f, 260f, goldPaint, 28f);
        goldPaint.setTextAlign(Paint.Align.LEFT);

        curY += 134f;

        Paint divPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        divPaint.setColor(subtleBorderColor);
        divPaint.setStrokeWidth(1.5f);
        canvas.drawLine(44f, curY, width - 44f, curY, divPaint);
        curY += 16f;

        // =====================================================================
        // ROW 2: Lunar Phase & 14-Part Enoch Bar | GPS Location & Sun Ephemeris
        // =====================================================================
        float row2H = 154f;
        RectF moonBox = new RectF(44f, curY, showGpsAndSunTimes ? 468f : (width - 44f), curY + row2H);
        canvas.drawRoundRect(moonBox, 22f, 22f, panelPaint);
        canvas.drawRoundRect(moonBox, 22f, 22f, subtleBorderPaint);

        drawMoonPhaseDisc(canvas, 88f, curY + 48f, 27f, lunarIllumPercent / 100f, accentGold);

        float moonTextMaxW = moonBox.width() - 104f;
        titlePaint.setTextSize(23f);
        drawFittedText(canvas, lunarPhaseLocalized, 128f, curY + 42f, moonTextMaxW, titlePaint, 15f);

        goldPaint.setTextSize(18f);
        drawFittedText(
                canvas,
                "Iluminação: " + lunarIllumPercent + "% · " + lunarAgeDays,
                128f,
                curY + 70f,
                moonTextMaxW,
                goldPaint,
                13f
        );

        canvas.drawLine(moonBox.left + 20f, curY + 90f, moonBox.right - 20f, curY + 90f, divPaint);

        subPaint.setTypeface(serifRegular);
        subPaint.setTextSize(17f);
        drawFittedText(canvas, enochLunarPartsLabel, moonBox.left + 20f, curY + 116f, moonBox.width() - 95f, subPaint, 12f);

        goldPaint.setTextAlign(Paint.Align.RIGHT);
        goldPaint.setTextSize(17f);
        drawFittedText(canvas, enochLunarParts + "/14", moonBox.right - 20f, curY + 116f, 65f, goldPaint, 12f);
        goldPaint.setTextAlign(Paint.Align.LEFT);

        // Full-width 14-Part Enoch Lunar Bar inside moonBox
        Paint partPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        float barLeft = moonBox.left + 20f;
        float barRight = moonBox.right - 20f;
        float totalBarW = barRight - barLeft;
        float partGap = 4f;
        float partW = (totalBarW - (13f * partGap)) / 14f;
        float barTop = curY + 126f;
        for (int i = 0; i < 14; i++) {
            partPaint.setColor(i < enochLunarParts ? accentGold : Color.argb(75, 148, 163, 184));
            float px = barLeft + i * (partW + partGap);
            canvas.drawRoundRect(new RectF(px, barTop, px + partW, barTop + 11f), 3f, 3f, partPaint);
        }

        if (showGpsAndSunTimes) {
            RectF gpsBox = new RectF(492f, curY, width - 44f, curY + row2H);
            canvas.drawRoundRect(gpsBox, 22f, 22f, panelPaint);
            canvas.drawRoundRect(gpsBox, 22f, 22f, subtleBorderPaint);

            float gpsMaxW = gpsBox.width() - 40f;
            titlePaint.setTextSize(22f);
            drawFittedText(canvas, "📍 " + locationCity, gpsBox.left + 20f, curY + 42f, gpsMaxW, titlePaint, 14f);

            mutedPaint.setTextSize(18f);
            drawFittedText(canvas, coordinatesFormatted, gpsBox.left + 26f, curY + 70f, gpsMaxW, mutedPaint, 13f);

            canvas.drawLine(gpsBox.left + 20f, curY + 90f, gpsBox.right - 20f, curY + 90f, divPaint);

            subPaint.setTypeface(serifRegular);
            subPaint.setTextSize(19f);
            drawFittedText(canvas, "☀ " + sunriseStr, gpsBox.left + 20f, curY + 128f, 120f, subPaint, 13f);

            subPaint.setTextAlign(Paint.Align.CENTER);
            drawFittedText(canvas, "☼ " + solarNoonStr, gpsBox.centerX(), curY + 128f, 120f, subPaint, 13f);
            subPaint.setTextAlign(Paint.Align.LEFT);

            goldPaint.setTextAlign(Paint.Align.RIGHT);
            goldPaint.setTextSize(19f);
            drawFittedText(canvas, "☾ " + sunsetStr, gpsBox.right - 20f, curY + 128f, 120f, goldPaint, 13f);
            goldPaint.setTextAlign(Paint.Align.LEFT);
        }

        curY += row2H + 18f;

        // =====================================================================
        // ROW 3: Sabbath Sunset Countdown + 2-Line Stacked 7-Day Rhythm Strip
        // =====================================================================
        if (renderRow3) {
            float row3H = showWeeklySabbathBar ? 184f : 96f;
            Paint sabbathBgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            sabbathBgPaint.setColor(sabbathPanelColor);

            RectF sabbathBox = new RectF(44f, curY, width - 44f, curY + row3H);
            canvas.drawRoundRect(sabbathBox, 22f, 22f, sabbathBgPaint);
            canvas.drawRoundRect(sabbathBox, 22f, 22f, borderPaint);

            goldPaint.setTextSize(21f);
            drawFittedText(
                    canvas,
                    "✦ " + sabbathStatusTitle.toUpperCase(Locale.ROOT) + "  ·  " + sabbathTargetDateLabel,
                    68f,
                    curY + 38f,
                    510f,
                    goldPaint,
                    13f
            );

            subPaint.setTypeface(serifItalic);
            subPaint.setTextSize(19f);
            drawFittedText(canvas, sabbathSunsetLabel, 68f, curY + 68f, 510f, subPaint, 13f);

            // Gold Countdown Badge on Right
            Paint pillPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            pillPaint.setColor(accentGold);
            RectF cdRect = new RectF(width - 356f, curY + 18f, width - 66f, curY + 74f);
            canvas.drawRoundRect(cdRect, 14f, 14f, pillPaint);

            Paint badgePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            badgePaint.setTypeface(serifBold);
            badgePaint.setTextSize(22f);
            badgePaint.setColor(badgeTextColor);
            badgePaint.setTextAlign(Paint.Align.CENTER);
            drawFittedText(canvas, sabbathCountdownStr, cdRect.centerX(), cdRect.centerY() + 8f, cdRect.width() - 20f, badgePaint, 13f);

            // 7-Day Weekly Sabbath Rhythm Strip (2-Line Stacked Cells: DIA / 1 .. SÁB / 7º)
            if (showWeeklySabbathBar) {
                float stripLeft = 68f;
                float stripRight = width - 68f;
                float totalStripW = stripRight - stripLeft;
                float dayGap = 10f;
                float dayBoxW = (totalStripW - (6f * dayGap)) / 7f;
                float dayTop = curY + 92f;
                float dayBot = curY + 164f;

                for (int d = 1; d <= 7; d++) {
                    float dx = stripLeft + (d - 1) * (dayBoxW + dayGap);
                    RectF dRect = new RectF(dx, dayTop, dx + dayBoxW, dayBot);
                    boolean isCurrent = (!isDayZero && dayOfWeek == d);
                    boolean isSab = (d == 7);

                    Paint dBg = new Paint(Paint.ANTI_ALIAS_FLAG);
                    if (isCurrent) {
                        dBg.setColor(accentGold);
                    } else if (isSab) {
                        dBg.setColor(Color.argb(65, Color.red(accentGold), Color.green(accentGold), Color.blue(accentGold)));
                    } else {
                        dBg.setColor(Color.argb(45, 148, 163, 184));
                    }
                    canvas.drawRoundRect(dRect, 12f, 12f, dBg);

                    Paint dTopTxt = new Paint(Paint.ANTI_ALIAS_FLAG);
                    dTopTxt.setTypeface(serifBold);
                    dTopTxt.setTextSize(14f);
                    dTopTxt.setTextAlign(Paint.Align.CENTER);
                    dTopTxt.setColor(isCurrent ? badgeTextColor : (isSab ? accentGold : textSecondary));
                    canvas.drawText(isSab ? "SÁB" : "DIA", dRect.centerX(), dayTop + 26f, dTopTxt);

                    Paint dNumTxt = new Paint(Paint.ANTI_ALIAS_FLAG);
                    dNumTxt.setTypeface(serifBold);
                    dNumTxt.setTextSize(21f);
                    dNumTxt.setTextAlign(Paint.Align.CENTER);
                    dNumTxt.setColor(isCurrent ? badgeTextColor : (isSab ? accentGold : textPrimary));
                    canvas.drawText(isSab ? "7º" : String.valueOf(d), dRect.centerX(), dayTop + 54f, dNumTxt);
                }
            }

            curY += row3H + 18f;
        }

        // =====================================================================
        // ROW 4: 13-Sign Mazzaroth & 1 Enoch Gate | Next Appointed Feast
        // =====================================================================
        if (renderRow4) {
            float row4H = 112f;
            if (showZodiacAndEnochGate && showNextFeast) {
                RectF zBox = new RectF(44f, curY, 468f, curY + row4H);
                canvas.drawRoundRect(zBox, 20f, 20f, panelPaint);
                canvas.drawRoundRect(zBox, 20f, 20f, subtleBorderPaint);

                titlePaint.setTextSize(21f);
                drawFittedText(
                        canvas,
                        zodiacSymbol + " " + zodiacName + " · " + zodiacArchetype,
                        zBox.left + 20f,
                        curY + 44f,
                        zBox.width() - 40f,
                        titlePaint,
                        13f
                );

                subPaint.setTypeface(serifRegular);
                subPaint.setTextSize(18f);
                drawFittedText(
                        canvas,
                        enochGateLabel + " · " + enochDayNightRatioLabel,
                        zBox.left + 20f,
                        curY + 82f,
                        zBox.width() - 40f,
                        subPaint,
                        12f
                );

                RectF fBox = new RectF(492f, curY, width - 44f, curY + row4H);
                canvas.drawRoundRect(fBox, 20f, 20f, panelPaint);
                canvas.drawRoundRect(fBox, 20f, 20f, subtleBorderPaint);

                goldPaint.setTextSize(16f);
                drawFittedText(
                        canvas,
                        "PRÓXIMA SOLENIDADE (LV 23)",
                        fBox.left + 20f,
                        curY + 40f,
                        fBox.width() - 40f,
                        goldPaint,
                        12f
                );

                titlePaint.setTextSize(21f);
                drawFittedText(
                        canvas,
                        nextFeastLabel,
                        fBox.left + 20f,
                        curY + 80f,
                        fBox.width() - 40f,
                        titlePaint,
                        13f
                );
            } else {
                RectF singleBox = new RectF(44f, curY, width - 44f, curY + row4H);
                canvas.drawRoundRect(singleBox, 20f, 20f, panelPaint);
                canvas.drawRoundRect(singleBox, 20f, 20f, subtleBorderPaint);

                if (showZodiacAndEnochGate) {
                    titlePaint.setTextSize(22f);
                    drawFittedText(
                            canvas,
                            zodiacSymbol + " " + zodiacName + " · " + zodiacArchetype,
                            singleBox.left + 22f,
                            curY + 44f,
                            singleBox.width() - 44f,
                            titlePaint,
                            14f
                    );
                    subPaint.setTypeface(serifRegular);
                    subPaint.setTextSize(19f);
                    drawFittedText(
                            canvas,
                            enochGateLabel + " · " + enochDayNightRatioLabel,
                            singleBox.left + 22f,
                            curY + 82f,
                            singleBox.width() - 44f,
                            subPaint,
                            13f
                    );
                } else {
                    goldPaint.setTextSize(17f);
                    drawFittedText(
                            canvas,
                            "PRÓXIMA SOLENIDADE (LV 23)",
                            singleBox.left + 22f,
                            curY + 40f,
                            singleBox.width() - 44f,
                            goldPaint,
                            13f
                    );
                    titlePaint.setTextSize(22f);
                    drawFittedText(
                            canvas,
                            nextFeastLabel,
                            singleBox.left + 22f,
                            curY + 80f,
                            singleBox.width() - 44f,
                            titlePaint,
                            14f
                    );
                }
            }

            curY += row4H + 18f;
        }

        // =====================================================================
        // ROW 5A: 7,000-Year Millennial Clock Progress Bar
        // =====================================================================
        if (renderMillennial) {
            float millH = 88f;
            RectF mBox = new RectF(44f, curY, width - 44f, curY + millH);
            canvas.drawRoundRect(mBox, 20f, 20f, panelPaint);
            canvas.drawRoundRect(mBox, 20f, 20f, subtleBorderPaint);

            goldPaint.setTextSize(19f);
            drawFittedText(canvas, millennialSummaryLabel, mBox.left + 22f, curY + 38f, mBox.width() - 130f, goldPaint, 13f);

            subPaint.setTypeface(serifBold);
            subPaint.setTextAlign(Paint.Align.RIGHT);
            subPaint.setTextSize(19f);
            String pctStr = String.format(Locale.US, "%.1f%%", millennialProgressPercent);
            drawFittedText(canvas, pctStr, mBox.right - 22f, curY + 38f, 90f, subPaint, 13f);
            subPaint.setTextAlign(Paint.Align.LEFT);

            // Progress Bar Track & Fill
            float trackLeft = mBox.left + 22f;
            float trackRight = mBox.right - 22f;
            float trackTop = curY + 54f;
            float trackBot = curY + 68f;
            Paint trackPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            trackPaint.setColor(Color.argb(65, 148, 163, 184));
            canvas.drawRoundRect(new RectF(trackLeft, trackTop, trackRight, trackBot), 7f, 7f, trackPaint);

            float fillW = (float) ((trackRight - trackLeft) * (Math.min(100.0, Math.max(0.0, millennialProgressPercent)) / 100.0));
            Paint fillPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            fillPaint.setColor(accentGold);
            canvas.drawRoundRect(new RectF(trackLeft, trackTop, Math.max(trackLeft + 14f, trackLeft + fillW), trackBot), 7f, 7f, fillPaint);

            curY += millH + 18f;
        }

        // =====================================================================
        // ROW 5B: Daily Scriptural Watchword Verse
        // =====================================================================
        if (renderVerse) {
            float verseH = 98f;
            RectF vBox = new RectF(44f, curY, width - 44f, curY + verseH);
            canvas.drawRoundRect(vBox, 20f, 20f, panelPaint);
            canvas.drawRoundRect(vBox, 20f, 20f, subtleBorderPaint);

            goldPaint.setTextSize(18f);
            drawFittedText(canvas, dailyVerseRef + ":", vBox.left + 22f, curY + 36f, vBox.width() - 44f, goldPaint, 13f);

            subPaint.setTypeface(serifItalic);
            subPaint.setTextSize(19f);
            drawFittedText(
                    canvas,
                    "“" + dailyVerseQuote + "”",
                    vBox.left + 22f,
                    curY + 72f,
                    vBox.width() - 44f,
                    subPaint,
                    12f
            );
        }

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

-- CreateTable
CREATE TABLE "PerformanceReport" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "timestamp" BIGINT NOT NULL,
    "url" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "lcpValue" REAL,
    "lcpRating" TEXT,
    "fidValue" REAL,
    "fidRating" TEXT,
    "clsValue" REAL,
    "clsRating" TEXT,
    "ttfbValue" REAL,
    "ttfbRating" TEXT,
    "totalImages" INTEGER NOT NULL DEFAULT 0,
    "lazyLoadedImages" INTEGER NOT NULL DEFAULT 0,
    "priorityImages" INTEGER NOT NULL DEFAULT 0,
    "averageImageLoadTime" REAL NOT NULL DEFAULT 0,
    "totalImageBandwidth" INTEGER NOT NULL DEFAULT 0,
    "compressedImageBandwidth" INTEGER NOT NULL DEFAULT 0,
    "bandwidthSavings" INTEGER NOT NULL DEFAULT 0,
    "dns" INTEGER NOT NULL DEFAULT 0,
    "tcp" INTEGER NOT NULL DEFAULT 0,
    "ttfb" INTEGER NOT NULL DEFAULT 0,
    "domInteractive" INTEGER NOT NULL DEFAULT 0,
    "domComplete" INTEGER NOT NULL DEFAULT 0,
    "pageLoadTime" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AlertPreference" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "enabledChannels" TEXT NOT NULL,
    "emailAddress" TEXT,
    "slackWebhookUrl" TEXT,
    "phoneNumber" TEXT,
    "thresholdSeverity" TEXT NOT NULL DEFAULT 'critical',
    "batchAlerts" BOOLEAN NOT NULL DEFAULT true,
    "batchIntervalMs" INTEGER NOT NULL DEFAULT 300000,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AlertNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" BIGINT NOT NULL,
    "metric" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "threshold" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "PerformanceReport_timestamp_idx" ON "PerformanceReport"("timestamp");

-- CreateIndex
CREATE INDEX "PerformanceReport_device_idx" ON "PerformanceReport"("device");

-- CreateIndex
CREATE INDEX "AlertNotification_timestamp_idx" ON "AlertNotification"("timestamp");

-- CreateIndex
CREATE INDEX "AlertNotification_severity_idx" ON "AlertNotification"("severity");

-- CreateIndex
CREATE INDEX "AlertNotification_channel_idx" ON "AlertNotification"("channel");

-- CreateIndex
CREATE INDEX "AlertNotification_status_idx" ON "AlertNotification"("status");

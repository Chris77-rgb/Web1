# Forjapp Android build service: Node.js + JDK 17 + Android SDK + Gradle.
#   docker build -f apps/builder/Dockerfile -t forjapp-builder .
FROM node:22-bookworm AS base
ARG GRADLE_VERSION=8.14.3
ARG ANDROID_CMDLINE_TOOLS=11076708
ENV ANDROID_HOME=/opt/android-sdk ANDROID_SDK_ROOT=/opt/android-sdk GRADLE_HOME=/opt/gradle
ENV PATH=$PATH:/opt/gradle/bin:/opt/android-sdk/cmdline-tools/latest/bin
RUN apt-get update && apt-get install -y --no-install-recommends openjdk-17-jdk-headless unzip curl ca-certificates fonts-dejavu-core \
 && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL -o /tmp/gradle.zip https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip \
 && unzip -q /tmp/gradle.zip -d /opt && mv /opt/gradle-${GRADLE_VERSION} /opt/gradle && rm /tmp/gradle.zip
RUN mkdir -p $ANDROID_HOME/cmdline-tools && cd /tmp \
 && curl -fsSL -o tools.zip https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_CMDLINE_TOOLS}_latest.zip \
 && unzip -q tools.zip && mv cmdline-tools $ANDROID_HOME/cmdline-tools/latest && rm tools.zip \
 && yes | sdkmanager --licenses > /dev/null \
 && sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0" > /dev/null

FROM base AS app
WORKDIR /repo
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/runtime/package.json packages/runtime/
COPY apps/web/package.json apps/web/
COPY apps/web/prisma apps/web/prisma
COPY apps/builder/package.json apps/builder/
RUN npm ci --workspace @forjapp/builder --workspace @forjapp/runtime --workspace @forjapp/shared --include-workspace-root --ignore-scripts \
 && npx prisma generate --schema apps/web/prisma/schema.prisma
COPY packages packages
COPY apps/builder apps/builder
RUN npm run build:runtime
# Warm the Gradle cache so the first user build doesn't download AGP/Kotlin (set WARM_GRADLE=false to skip).
ARG WARM_GRADLE=true
RUN if [ "$WARM_GRADLE" = "true" ]; then cd apps/builder/android-template && echo "sdk.dir=$ANDROID_HOME" > local.properties \
    && gradle assembleRelease --no-daemon -q && rm -rf build app/build .gradle local.properties; fi
ENV STORAGE_DIR=/data/storage BUILDER_WORK_DIR=/tmp/forjapp-work GRADLE_DAEMON=true
WORKDIR /repo/apps/builder
CMD ["npx", "tsx", "src/index.ts"]

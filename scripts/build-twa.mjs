import fs from "node:fs";
import path from "node:path";

const srcRoot = "C:/Users/AlCe";
const dstRoot = "C:/Users/AlCe/Desktop/FiguTrivia/twa-android";
fs.rmSync(dstRoot, { recursive: true, force: true });
fs.mkdirSync(dstRoot, { recursive: true });

for (const f of ["build.gradle", "settings.gradle", "gradle.properties", "gradlew", "gradlew.bat"]) {
  fs.copyFileSync(path.join(srcRoot, f), path.join(dstRoot, f));
}
fs.cpSync(path.join(srcRoot, "gradle"), path.join(dstRoot, "gradle"), { recursive: true });
fs.cpSync(path.join(srcRoot, "app", "src"), path.join(dstRoot, "app", "src"), { recursive: true });

const oldJavaDir = path.join(dstRoot, "app/src/main/java/com/kickofftrivia/app");
const newJavaDir = path.join(dstRoot, "app/src/main/java/com/figutrivia/app");
fs.mkdirSync(newJavaDir, { recursive: true });
for (const jf of fs.readdirSync(oldJavaDir)) {
  const txt = fs
    .readFileSync(path.join(oldJavaDir, jf), "utf8")
    .replace(/com\.kickofftrivia\.app/g, "com.figutrivia.app");
  fs.writeFileSync(path.join(newJavaDir, jf), txt, "utf8");
}
fs.rmSync(path.join(dstRoot, "app/src/main/java/com/kickofftrivia"), { recursive: true, force: true });

let bg = fs.readFileSync(path.join(srcRoot, "app/build.gradle"), "utf8");
bg = bg
  .replace(/com\.kickofftrivia\.app/g, "com.figutrivia.app")
  .replace(/launchUrl: 'https:\/\/kickoff-trivia\.com\/'/, "launchUrl: '/'")
  .replace(/kickoff-trivia\.com/g, "figutrivia.vercel.app")
  .replace(/Kickoff Trivia/g, "FiguTrivia")
  .replace(/'Kickoff'/g, "'FiguTrivia'")
  .replace(/themeColor: '#000000'/, "themeColor: '#fbbf24'");
fs.writeFileSync(path.join(dstRoot, "app/build.gradle"), bg, "utf8");

for (const rel of ["app/src/main/AndroidManifest.xml", "app/src/main/res/values/strings.xml"]) {
  const p = path.join(dstRoot, rel);
  const txt = fs
    .readFileSync(p, "utf8")
    .replace(/com\.kickofftrivia\.app/g, "com.figutrivia.app")
    .replace(/kickoff-trivia\.com/g, "figutrivia.vercel.app");
  fs.writeFileSync(p, txt, "utf8");
}
fs.copyFileSync(
  "C:/Users/AlCe/Desktop/FiguTrivia/client/public/manifest.json",
  path.join(dstRoot, "app/src/main/res/raw/web_app_manifest.json")
);

const icon512 = fs.readFileSync("C:/Users/AlCe/Desktop/FiguTrivia/client/public/icon-512.png");
const icon192 = fs.readFileSync("C:/Users/AlCe/Desktop/FiguTrivia/client/public/icon-192.png");
for (const d of ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"]) {
  const buf = d === "mdpi" || d === "hdpi" ? icon192 : icon512;
  fs.writeFileSync(path.join(dstRoot, `app/src/main/res/mipmap-${d}/ic_launcher.png`), buf);
  fs.writeFileSync(path.join(dstRoot, `app/src/main/res/mipmap-${d}/ic_maskable.png`), buf);
  fs.writeFileSync(path.join(dstRoot, `app/src/main/res/drawable-${d}/splash.png`), icon512);
}

fs.writeFileSync(
  path.join(dstRoot, "local.properties"),
  "sdk.dir=C:\\\\Users\\\\AlCe\\\\.bubblewrap\\\\android_sdk\n",
  "utf8"
);
console.log("Prepared TWA project in", dstRoot);

if (!process.env.NODE_ENV || process.env.NODE_ENV !== "production") {
  const fs = require("fs");
  fs.writeFileSync(
    ".env",
    [
      "REACT_APP_FormsLink=https://forms.gle/9rDLcRBUpcUb4FR89",
      "NODE_ENV=development",
      "REACT_APP_BANNER=",
      "REACT_APP_CDN_URL=./static",
      "REACT_APP_S3=./static",
      "REACT_APP_FIREBASE_API_KEY=fake-key",
      "REACT_APP_FIREBASE_AUTH_DOMAIN=demo-ppc.firebaseapp.com",
      "REACT_APP_FIREBASE_PROJECT_ID=demo-ppc",
      "REACT_APP_FIREBASE_STORAGE_BUCKET=demo-ppc.appspot.com",
      "REACT_APP_FIREBASE_MESSAGING_SENDER_ID=000000000000",
      "REACT_APP_FIREBASE_APP_ID=1:000000000000:web:0000000000000000",
      "REACT_APP_USE_AUTH_EMULATOR=false"
    ].join("\n")
  );
}

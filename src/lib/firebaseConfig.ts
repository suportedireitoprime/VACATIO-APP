// Firebase Web config — valores públicos (ficam no bundle do cliente).
// Não são secrets: podem estar versionados. Segurança do FCM é feita via
// regras do projeto + VAPID + auth do servidor (service account no edge).

export const firebaseWebConfig = {
  apiKey: "AIzaSyD0RZQxyxvFByXiRp0wtQySms_VQ6aeFUk",
  authDomain: "vactio-vade-mecum.firebaseapp.com",
  projectId: "vactio-vade-mecum",
  storageBucket: "vactio-vade-mecum.firebasestorage.app",
  messagingSenderId: "833040915353",
  appId: "1:833040915353:web:2b66d20dfd752da0099108",
  measurementId: "G-86C6ZMZLQM",
};

export const firebaseVapidKey =
  "BCQ206B0VeqX8GVLFC4siFRCaf4ka94rEUeYA8ie_BNHzMHFa_jFWDWwjMIJFzLWB_5p4_yZTwihRVrsIbsQxEk";

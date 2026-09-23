import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = Object.freeze({
  apiKey: "AIzaSyDCsHw0ibb4pMytyPlVvoCzNKZXy3OSTOo",
  authDomain: "finsegye-upload.firebaseapp.com",
  projectId: "finsegye-upload",
  storageBucket: "finsegye-upload.firebasestorage.app",
  messagingSenderId: "361113771740",
  appId: "1:361113771740:web:9bbc4b6807535d37a65e19",
  measurementId: "G-XQ43DWJRBB"
});

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app, "gs://finsegye-upload.firebasestorage.app");

window.finsegyeFirebaseReady = signInAnonymously(auth)
  .then((credential) => {
    window.firebaseAuthUser = credential.user;
    window.storage = storage;
    window.firebaseRef = ref;
    window.uploadBytes = uploadBytes;
    window.getDownloadURL = getDownloadURL;
    window.dispatchEvent(new CustomEvent("finsegye:firebase-ready"));
    console.log("Firebase 익명 인증 및 Storage 연결 완료");
    return Object.freeze({ app, auth, storage, user: credential.user });
  })
  .catch((error) => {
    window.firebaseAuthError = error;
    window.dispatchEvent(new CustomEvent("finsegye:firebase-error", { detail: error }));
    console.error("Firebase 익명 인증 실패", error);
    throw error;
  });


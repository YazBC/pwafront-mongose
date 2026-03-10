importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBIaCVh9j4wRslxXKIzzIU2KdJu5s2cj6s",
  authDomain: "pwa-yaz.firebaseapp.com",
  projectId: "pwa-yaz",
  storageBucket: "pwa-yaz.firebasestorage.app",
  messagingSenderId: "523783868114",
  appId: "1:523783868114:web:ab34185f4d0d9bc476670b"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
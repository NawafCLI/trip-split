// Trip settings shared by all three phones.
//
// tripId: a private random ID. Everyone using the same tripId sees the same expenses.
// firebase: the web config from the Firebase console. It is meant to be public; the
//           database rules in firestore.rules are what limit what can be written.
window.TRIP_CONFIG = {
  tripId: "XIbM-YT0LK_9bEC9E2DHBzyv",
  firebase: {
    apiKey: "AIzaSyCfoekdj6hSF4cCX6gTxH3PhWMEzl2qQ3g",
    authDomain: "bndat-c74f8.firebaseapp.com",
    projectId: "bndat-c74f8",
    storageBucket: "bndat-c74f8.firebasestorage.app",
    messagingSenderId: "276233634196",
    appId: "1:276233634196:web:7928779514cb1b14694f81",
  },
};

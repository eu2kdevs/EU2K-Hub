import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getPerformance } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-performance.js";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/learn-more#config-object
const firebaseConfig = {
    apiKey: "AIzaSyBRRVx6BtQtCDKjFYA8yh9qYrcUONmkkwI",
    authDomain: "eu2k-hub.firebaseapp.com",
    projectId: "eu2k-hub",
    storageBucket: "eu2k-hub.firebasestorage.app",
    messagingSenderId: "560244867055",
    appId: "1:560244867055:web:3cd51b85baead94989001a",
    measurementId: "G-2JDPR089WD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


// Initialize Performance Monitoring and get a reference to the service
const perf = getPerformance(app);
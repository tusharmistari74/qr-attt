import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCWWohFOD9O_UbsgtLNZ-VzzMGm9F2b0yI",
  authDomain: "smartqrattendance-82210.firebaseapp.com",
  projectId: "smartqrattendance-82210",
  storageBucket: "smartqrattendance-82210.firebasestorage.app",
  messagingSenderId: "362391885515",
  appId: "1:362391885515:web:ab977a09adf2f65caded4e",
  measurementId: "G-CH5FYK5SQB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

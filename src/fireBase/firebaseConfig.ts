import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyACOdiaZLT1L1INITi5k3TMx3jNGUJwHMg",
  authDomain: "map-test-task-64818.firebaseapp.com",
  projectId: "map-test-task-64818",
  storageBucket: "map-test-task-64818.appspot.com",
  messagingSenderId: "282980476702",
  appId: "1:282980476702:web:992f074692dfb5fadbcb0f",
  measurementId: "G-V1PKRQ1ZL2",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };

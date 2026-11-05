// ==========================================
// OMNIMAPP - Configuración de Firebase
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyDyqGCGO0hKrrFv091SkfOYZmG2UGDgXJ0",
    authDomain: "condoapp-d1729.firebaseapp.com",
    databaseURL: "https://condoapp-d1729-default-rtdb.firebaseio.com",
    projectId: "condoapp-d1729",
    storageBucket: "condoapp-d1729.firebasestorage.app",
    messagingSenderId: "834784357986",
    appId: "1:834784357986:web:90855a08e0c5399d8aeb3b"
};

// Inicializar Firebase y la base de datos
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

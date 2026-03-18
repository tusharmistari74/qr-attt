const firebaseObj = require('firebase/compat/app');
console.log('firebase.apps:', !!firebaseObj.apps);
console.log('firebase.default?.apps:', !!(firebaseObj.default && firebaseObj.default.apps));

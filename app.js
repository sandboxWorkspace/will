// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB1EKbZydFivIP226_qZGgo1q5v5xvdGSQ",
    authDomain: "tirrseforms.firebaseapp.com",
    databaseURL: "https://tirrseforms-default-rtdb.firebaseio.com",
    projectId: "tirrseforms",
    storageBucket: "tirrseforms.appspot.com",
    messagingSenderId: "116367446851",
    appId: "1:116367446851:web:a876aa303612627a1ed5f6",
    measurementId: "G-FG8G93VDLV"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
console.log("Firebase initialized");
const database = firebase.database();
console.log("getDatabase succeeded");

function getData() {
  const dataRef = database.ref('masterSheet');
  dataRef.once('value', (snapshot) => {
      const data = snapshot.val();
      const tableBody = document.getElementById('data-table-body');
      tableBody.innerHTML = ''; // Clear existing table body
      for (let id in data) {
          const rowData = data[id];
          const row = document.createElement('tr');
          rowData.forEach((cellData) => {
              const cell = document.createElement('td');
              cell.textContent = cellData;
              row.appendChild(cell);
          });
          tableBody.appendChild(row);
      }
  });
}

// Call function when the page loads
window.onload = function() {
  getData();
};
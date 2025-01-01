const DB_NAME = "bleAppDB";
const DB_VERSION = 1;
const STORE_NAME = "bleDataStore";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create the object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });

        // Create an index on 'barcode' for lookups by barcode
        objectStore.createIndex("barcode", "barcode", { unique: true });
      } else {
        const objectStore = event.target.transaction.objectStore(STORE_NAME);

        // Ensure that the 'barcode' index exists
        if (!objectStore.indexNames.contains("barcode")) {
          objectStore.createIndex("barcode", "barcode", { unique: true });
        }
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

function addData(data) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(data);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  });
}

function getData(id) {
  if (typeof id === "undefined" || id === null) {
    return Promise.reject("Invalid key provided for getData");
  }

  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id); // Ensure 'id' is a valid key

      request.onsuccess = () => {
        if (request.result !== undefined) {
          resolve(request.result);
        } else {
          reject("No matching record found");
        }
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  });
}

function getAllData() {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  });
}

function deleteData(id) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  });
}

const getDataByBarcode = (barcode) => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION); // Ensure you're using the correct DB name and version

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(STORE_NAME, "readonly"); // Use the correct store name (bleDataStore)
      const store = transaction.objectStore(STORE_NAME);

      // Access the 'barcode' index to query the record by barcode
      const index = store.index("barcode");
      const getRequest = index.get(barcode);

      getRequest.onsuccess = () => {
        if (getRequest.result) {
          resolve(getRequest.result); // Resolve the matching record
        } else {
          reject("No matching record found for barcode.");
        }
      };

      getRequest.onerror = () => reject("Failed to fetch product details.");
    };

    request.onerror = () => reject("Failed to open database.");
  });
};

export { addData, getData, getAllData, deleteData, getDataByBarcode };

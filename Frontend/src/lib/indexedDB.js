// lib/indexedDB.js

const DB_NAME = "pharmacyDB"
const DB_VERSION = 1
const NOTIFICATIONS_STORE = "notifications"
const SALES_HISTORY_STORE = "salesHistory"
const PRODUCTS_STORE = "products"
const PENDING_SALES_STORE = "pendingSales" // For offline sales

let db

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      db = event.target.result
      if (!db.objectStoreNames.contains(NOTIFICATIONS_STORE)) {
        db.createObjectStore(NOTIFICATIONS_STORE, { keyPath: "_id" })
      }
      if (!db.objectStoreNames.contains(SALES_HISTORY_STORE)) {
        db.createObjectStore(SALES_HISTORY_STORE, { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains(PRODUCTS_STORE)) {
        db.createObjectStore(PRODUCTS_STORE, { keyPath: "_id" })
      }
      if (!db.objectStoreNames.contains(PENDING_SALES_STORE)) {
        db.createObjectStore(PENDING_SALES_STORE, { keyPath: "id", autoIncrement: true })
      }
      console.log("IndexedDB upgrade complete")
    }

    request.onsuccess = (event) => {
      db = event.target.result
      console.log("IndexedDB opened successfully")
      resolve(db)
    }

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error)
      reject(event.target.error)
    }
  })
}

async function getObjectStore(storeName, mode) {
  if (!db) {
    db = await openDatabase()
  }
  const transaction = db.transaction(storeName, mode)
  return transaction.objectStore(storeName)
}

export async function addData(storeName, data) {
  const store = await getObjectStore(storeName, "readwrite")
  return new Promise((resolve, reject) => {
    const request = store.add(data)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function putData(storeName, data) {
  const store = await getObjectStore(storeName, "readwrite")
  return new Promise((resolve, reject) => {
    const request = store.put(data) // Use put for update/add
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getAllData(storeName) {
  const store = await getObjectStore(storeName, "readonly")
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteData(storeName, key) {
  const store = await getObjectStore(storeName, "readwrite")
  return new Promise((resolve, reject) => {
    const request = store.delete(key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function clearStore(storeName) {
  const store = await getObjectStore(storeName, "readwrite")
  return new Promise((resolve, reject) => {
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Initialize the database when the module is loaded
openDatabase().catch(console.error)

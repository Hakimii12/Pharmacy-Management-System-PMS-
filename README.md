# 💊 Pharmacy Management System (PMS)

A full-stack web application designed to streamline and automate pharmacy operations — from inventory and sales management to reporting and user administration.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [User Roles](#user-roles)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)

---

## 🏥 Overview

The **Pharmacy Management System (PMS)** is a robust web-based solution built for pharmacies to manage their day-to-day operations efficiently. It provides real-time dashboards, inventory tracking across multiple locations (backstore & dispensary), complete sales workflows, automated expiry/low-stock alerts, profit tracking, and role-based access control.

---

## ✨ Features

### 📊 Dashboard
- Real-time statistics: total products, total sales, low stock count, and monthly profit
- Sales overview chart
- Low stock alerts panel
- Near-expiry products table
- Recent sales feed

### 🗂️ Inventory Management
- **Backstore** – Manage bulk/warehouse stock with full CRUD operations
- **Dispensary** – Track dispensary-level stock separately from backstore
- **Store History** – View a complete audit trail of backstore stock movements
- **Dispensary History** – View all dispensary-level stock changes over time
- Stock transfer between backstore and dispensary
- Automatic low-stock and near-expiry detection via scheduled background jobs

### 💊 Product Management
- Add, edit, and delete pharmaceutical products
- Support for product categories and dosage forms
- Track brand, batch number, expiry date, purchase price, and selling price
- Image upload support via Cloudinary

### 🛒 Sales Management
- **Purchase Orders** – Create and manage purchase orders from suppliers
- **Receive Orders** – Confirm and receive ordered stock into inventory
- **Sales History** – View complete transaction history
- **Credit Management / Daily Balance** – Close daily balance and manage credit sales

### 🔔 Notifications
- Automatic alerts for low-stock items
- Automatic alerts for products nearing expiry
- Centralized notifications page

### 📈 Reports
- Comprehensive financial and inventory reports
- Profit tracking (daily, monthly)
- Sales performance analytics

### 👥 User Administration
- Role-based access control with 4 roles: `superAdmin`, `admin`, `pharmacist`, `cashier`
- User approval workflow (pending → approved / rejected)
- Account suspension and management
- JWT-based authentication with HTTP-only cookies

### ⚙️ Settings
- Manage dosage forms (tablets, capsules, syrups, etc.)
- Manage product categories

---

## 🛠️ Tech Stack

### Backend

| Technology | Purpose |
|---|---|
| **Node.js + Express.js v5** | REST API server |
| **MongoDB + Mongoose** | Database & ODM |
| **JWT (jsonwebtoken)** | Authentication & authorization |
| **bcryptjs** | Password hashing |
| **Cloudinary** | Product image storage |
| **Multer** | File/image upload handling |
| **node-cron** | Scheduled jobs (expiry checker) |
| **cookie-parser** | Secure HTTP-only cookie management |
| **dotenv** | Environment variable management |
| **nodemon** | Development auto-reload |

### Frontend

| Technology | Purpose |
|---|---|
| **React 19 + Vite** | UI framework & bundler |
| **React Router DOM v7** | Client-side routing |
| **Tailwind CSS v3** | Utility-first styling |
| **Axios** | HTTP client for API calls |
| **Framer Motion** | Animations & transitions |
| **Chart.js + react-chartjs-2** | Sales & inventory charts |
| **Lucide React + React Icons** | Icon libraries |
| **React Toastify** | Toast notifications |
| **React DatePicker** | Date selection UI |

---

## 📁 Project Structure

```
Pharmacy-Management-System-PMS-/
├── Backend/
│   ├── controllers/              # Business logic handlers
│   │   ├── ProductController.js
│   │   ├── SalesController.js
│   │   ├── InventoryController.js
│   │   ├── userController.js
│   │   ├── Notification.js
│   │   ├── ProfitController.js
│   │   └── dosageformsandcategory.js
│   ├── models/                   # Mongoose data models
│   │   ├── UserModel.js
│   │   ├── ProductModel.js
│   │   ├── SalesModel.js
│   │   ├── StoreModel.js
│   │   ├── DispensaryModel.js
│   │   ├── NotificationModel.js
│   │   ├── DailyBalance.js
│   │   ├── ProfitModel.js
│   │   ├── Transfer.js
│   │   ├── categorymodel.js
│   │   └── dosageformsmodel.js
│   ├── routes/                   # Express API routes
│   │   ├── DrugRoutes.js
│   │   ├── SalesRoutes.js
│   │   ├── UserRoutes.js
│   │   ├── InventoryRoutes.js
│   │   ├── NotificationRoutes.js
│   │   ├── ProfitRoutes.js
│   │   └── dosageformsandcategoryroutes.js
│   ├── middlewares/              # Auth & validation middleware
│   ├── database/                 # MongoDB connection setup
│   ├── helper/                   # Utility helpers
│   ├── utils/                    # Scheduled jobs (expiry checker)
│   └── main.js                   # Server entry point
│
├── Frontend/
│   ├── src/
│   │   ├── pages/                # Top-level route pages
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── Reports.jsx
│   │   │   ├── Notifications.jsx
│   │   │   └── userAdminstration/
│   │   ├── InventoryManagament/  # Inventory-related pages
│   │   │   ├── BackstoreList.jsx
│   │   │   ├── Dispensary.jsx
│   │   │   ├── StoreHistory/
│   │   │   └── DispensaryHistory/
│   │   ├── components/           # Reusable UI components
│   │   │   ├── layout/           # App layout & sidebar
│   │   │   ├── dashboard/        # Charts & widgets
│   │   │   └── SalesList.jsx/    # Purchase, Receive, Sales, Credit
│   │   ├── security/             # Login, Signup, Logout
│   │   ├── Setting/              # Dosage forms & categories
│   │   ├── contexts/             # React Context (auth state)
│   │   ├── data/                 # API config (API.json)
│   │   └── App.jsx               # Root component & routing
│   ├── index.html
│   └── package.json
│
├── .env                          # Backend environment variables
└── package.json                  # Root package (backend runner)
```

---

## ✅ Prerequisites

Make sure you have the following installed on your machine before proceeding:

- **Node.js** v18 or higher → [Download](https://nodejs.org/)
- **npm** v9 or higher (comes with Node.js)
- **MongoDB** – A [MongoDB Atlas](https://www.mongodb.com/atlas) account (cloud) or a local MongoDB instance
- **Git** → [Download](https://git-scm.com/)

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Hakimii12/Pharmacy-Management-System-PMS-.git
cd Pharmacy-Management-System-PMS-
```

### 2. Install Backend Dependencies

From the **root** of the project:

```bash
npm install
```

### 3. Install Frontend Dependencies

```bash
cd Frontend
npm install
cd ..
```

### 4. Configure Environment Variables

See the [Environment Variables](#environment-variables) section below and create the required `.env` files.

---

## 🔑 Environment Variables

### Backend — `.env` (root directory)

Create a file named `.env` in the **root** of the project with the following variables:

```env
PORT=5000
DATABASE_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority&appName=<appName>
JWT_SECRET=your_strong_jwt_secret_key
```

| Variable | Description |
|---|---|
| `PORT` | Port the backend server will listen on (default: `5000`) |
| `DATABASE_URL` | Your MongoDB connection string (Atlas or local) |
| `JWT_SECRET` | A strong, random secret key used to sign JWT tokens |

> **Tip:** For a local MongoDB instance use: `DATABASE_URL=mongodb://localhost:27017/pharmacyDB`

### Backend — Cloudinary (optional, for product image uploads)

Add these to your root `.env` if you want image upload support:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend — `Frontend/.env`

Create a file named `.env` inside the `Frontend/` folder:

```env
VITE_API_URL=http://localhost:5000
```

> **Note:** The frontend reads the backend API base URL from `Frontend/src/data/API.json`. Make sure the value in that file points to your running backend URL.

---

## ▶️ Running the Application

You need to run both the **backend** and the **frontend** servers. Open **two separate terminals**.

### Terminal 1 — Start the Backend

From the **root** directory of the project:

```bash
npm run dev
```

The backend server will start at: `http://localhost:5000`

### Terminal 2 — Start the Frontend

```bash
cd Frontend
npm run dev
```

The frontend development server will start at: `http://localhost:5173`

### Open the App

Open your browser and navigate to:

```
http://localhost:5173
```

You will be redirected to the **Login** page automatically.

> **First Time Setup:** After registering, new accounts have a `pending` status. A `superAdmin` must approve them. For initial setup, manually update the first user's `status` to `approved` and `role` to `superAdmin` directly in your MongoDB database (via MongoDB Compass or Atlas UI).

---

## 👤 User Roles

The system supports four roles with different levels of access:

| Role | Access Level | Description |
|---|---|---|
| `superAdmin` | Full | Complete system access, can manage all users and admins |
| `admin` | High | Manages users, inventory, products, and sales |
| `pharmacist` | Medium | Manages products, inventory, and dispensary operations |
| `cashier` | Limited | Handles sales transactions only |

**User Status Lifecycle:**

```
Register → pending ──► approved  (by admin / superAdmin)
                   └─► rejected

           approved ──► suspended  (by admin / superAdmin)
```

---

## 📡 API Endpoints

All API routes are prefixed with `/api`. The server runs on the configured `PORT` (default: `5000`).

| Prefix | Description |
|---|---|
| `GET/POST/PUT/DELETE /api/product` | Product CRUD, search, count |
| `GET/POST/PUT/DELETE /api/sales` | Sales transactions, purchase & receive orders |
| `GET/POST/PUT/DELETE /api/inventory` | Backstore & dispensary stock management |
| `POST /api/user/login` | User login |
| `POST /api/user/signup` | User registration |
| `POST /api/user/logout` | User logout |
| `GET /api/user/...` | User management (admin only) |
| `GET /api/notify/getLowStock` | Fetch low stock alerts |
| `GET /api/notify/getNearExpiryProducts` | Fetch near-expiry alerts |
| `GET /api/profit/profit` | Profit calculations |
| `GET/POST/DELETE /api/form` | Dosage forms & product categories |

---

## ☁️ Deployment

This project is configured for deployment on **[Render](https://render.com)**.

### Backend (Web Service)
- **Root Directory:** `/` (project root)
- **Build Command:** `npm install`
- **Start Command:** `node Backend/main.js`
- Set all backend environment variables in the Render dashboard → **Environment** tab

### Frontend (Static Site)
- **Root Directory:** `Frontend/`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- The `postbuild` script automatically generates a `_redirects` file for SPA routing

> The live deployed frontend is available at: **https://hamzamasjidpharamacy.onrender.com**

---

## 📄 License

This project is licensed under the **ISC License**.

---

## 🙋‍♂️ Author

Developed and maintained by **Hakimii12**.

- GitHub: [@Hakimii12](https://github.com/Hakimii12)
- Issues: [Report a bug](https://github.com/Hakimii12/Pharmacy-Management-System-PMS-/issues)

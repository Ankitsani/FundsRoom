# Mini ERP + CRM Operations Portal

A complete, production-quality Mini ERP & CRM Operations Portal built for wholesale/distribution companies. It manages customer directories, client follow-up notes, product catalogs, warehouse locations, and transaction-based delivery challans.

---

## 1. Tech Stack

- **Backend:** Node.js, TypeScript, Express.js, Prisma (PostgreSQL ORM), Zod (Validation), and JSON Web Tokens (Authentication).
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Lucide icons, and React Router (Role-based protected routes).
- **Database:** PostgreSQL (with a transactional lock pattern to guarantee stock never drops below zero).

---

## 2. Default Login Credentials

Seeded test accounts representing all four standard user roles in the organization:

| Role | Username / Email | Password | Allowed Access Views |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@fundsroom.com` | `admin123` | All pages (Dashboard, CRM, Products, Challans, Status controls) |
| **Sales** | `sales@fundsroom.com` | `sales123` | Dashboard, CRM, Challans (Create & Confirm), Read-only products |
| **Warehouse** | `warehouse@fundsroom.com` | `warehouse123` | Dashboard, Product catalog (Edit stock & view logs), Read-only CRM |
| **Accounts** | `accounts@fundsroom.com` | `accounts123` | Dashboard, CRM, Read-only Challans (Financial details & status check) |

---

## 3. Repository Structure

```
/backend
  /prisma
    - schema.prisma      # Relational database layout
    - seed.ts            # Default data seeder script
  /src
    /config              # Database configuration (Prisma client)
    /middleware          # Authentication & role authorization middlewares
    /modules             # Domain controllers and routes
  - .env.example
  - tsconfig.json
  - package.json
/frontend
  /src
    /api                 # Typed REST API client
    /components          # Sidebar, layout grids, protected routing, custom toasts
    /context             # Session management (AuthContext)
    /pages               # Active views (Dashboard, CRM, Inventory, Invoices)
  - .env.example
  - tailwind.config.js
  - postcss.config.js
  - package.json
/docs
  - architecture.md      # Detailed database schema and transaction description
  - postman_collection.json # API endpoints tests collection
- docker-compose.yml     # Local PostgreSQL database runner
- README.md
```

---

## 4. Environment Variables Reference

### Backend (`/backend/.env`)
- `PORT`: Server port number (default `5000`).
- `DATABASE_URL`: Connection string for PostgreSQL database (e.g. `postgresql://postgres:postgres@localhost:5432/fundsroom_erp?schema=public`).
- `JWT_SECRET`: Security salt string used to sign and verify employee JSON Web Tokens.

### Frontend (`/frontend/.env`)
- `VITE_API_URL`: Path prefix or absolute domain pointing to the backend service (default `/api` which proxies locally to `http://localhost:5000`).

---

## 5. Local Setup & Running Guide

Run these steps in order to set up and run the portal locally.

### Step 1: Start PostgreSQL Database
If you have Docker installed, run this command in the project root to spin up a PostgreSQL instance:
```bash
docker-compose up -d
```
Alternatively, provision a local PostgreSQL database or create a free PostgreSQL instance on **Supabase** or **Neon**.

### Step 2: Configure Environment Files
1. Create a `.env` file in the `/backend` folder:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Open `backend/.env` and update the `DATABASE_URL` with your PostgreSQL connection string.
2. Create a `.env` file in the `/frontend` folder:
   ```bash
   cp frontend/.env.example frontend/.env
   ```

### Step 3: Initialize Database & Run Seed
Run these commands in the `/backend` folder to run migrations and seed the database with mock test data:
```bash
cd backend
npm install
npx prisma db push
npm run prisma:seed
```

### Step 4: Run Development Servers

**Start Backend (running on port 5000):**
In the `/backend` folder:
```bash
npm run dev
```

**Start Frontend (running on port 3000):**
In another terminal, navigate to the `/frontend` folder:
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 6. Live Deployment Guide

Follow these instructions to deploy the system to free platforms:

### Database (Supabase / Neon)
1. Register on [Neon.tech](https://neon.tech/) or [Supabase.com](https://supabase.com/).
2. Create a new PostgreSQL project and copy the connection string.
3. Replace the `DATABASE_URL` variable in your backend environment configuration.

### Backend (Render / Railway)
1. Push this repository to a GitHub account.
2. Register on [Render.com](https://render.com/).
3. Create a new **Web Service** and link it to the repository.
4. Set the root directory to `backend`.
5. Configure the Build Command to `npm run build` and Start Command to `npm run start`.
6. Add environment variables: `DATABASE_URL` and a random string for `JWT_SECRET`.

### Frontend (Vercel / Netlify)
1. Register on [Vercel.com](https://vercel.com/).
2. Import the repository.
3. Configure the Root Directory to `frontend`.
4. Set the framework preset to **Vite**.
5. Add environment variable `VITE_API_URL` pointing to your deployed backend API URL (e.g. `https://your-backend.onrender.com/api`).
6. Deploy!

---

## 7. Key Assumptions & Known Limitations

- **Assumptions:**
  - In sequential challan generation, the sequential sequence increments by looking at the largest number starting with `CH-YYYY-` (calendar year) inside the active year.
  - An Indian GSTIN is assumed to follow a standard 15-character alphanumeric format check, while mobile numbers allow international formats (10-14 digits).
  - Deleting/cancelling DRAFT challans does not restore stock since DRAFT status never decrements stock levels. Only cancelling CONFIRMED challans increments stock back.
- **Known Limitations:**
  - Deleting customers or products is disabled by default to maintain historical foreign key constraint integrity on Challans.
  - Manual stock logs must be associated with the active logged-in User ID, which is why JWT headers are required for all inventory mutations.

# GeoBus: Real-Time Transit Tracking System

## Project Overview
GeoBus is an real-time public transit tracking system designed to bridge the information gap between transit operators and passengers. By providing live location updates, route visualization, and role-based access control, the platform ensures that commuters can make informed travel decisions while operators maintain full visibility over their fleet. 

Unlike traditional transit applications that rely solely on hardware GPS, GeoBus features an innovative crowdsourced tracking mechanism. When official bus tracking is unavailable, the system intelligently aggregates verified passenger locations to estimate the vehicle's position, ensuring continuous service reliability.

## Key Features
* **Real-Time Fleet Tracking:** Live transmission of bus coordinates and speed using bidirectional WebSocket communication.
* **Role-Based Interfaces:** Distinct experiences for Drivers and Passengers. 
* **Crowdsourced Location Aggregation:** A fallback mechanism that calculates bus positions based on the aggregated, geofence-verified locations of passengers on board.
* **Trust Verification:** Spatial validation algorithms to ensure that crowdsourced reports come from passengers actually on the designated route, filtering out invalid data.
* **Route Bookmarking:** Passengers can save their frequently used routes for quick access and personalized views.
* **Driver Verification:** Secure clearance system to ensure only authorized personnel can broadcast fleet locations.

## System Architecture
The application is built using a modern, scalable tech stack, separated into a mobile client and a Node.js backend.

### Frontend (Mobile Application)
The mobile application is built to run on both iOS and Android platforms, providing a native feel through web technologies.
* **Framework:** React Native with Expo.
* **Routing:** Expo Router.
* **Mapping:** React Native Maps for rendering routes, user locations, and live vehicle markers.
* **Real-time Communication:** Socket.io client for WebSocket updates and location broadcasting.
* **Authentication:** Firebase integration for secure user identity management.

### Backend (Server)
The backend is designed for high concurrency to handle continuous location streams from multiple vehicles and passengers simultaneously.
* **Environment:** Node.js with Express.js.
* **Real-time Engine:** Socket.io handles simultaneous connections, broadcasting driver coordinates and aggregating passenger reports in memory.
* **Database:** PostgreSQL as the primary relational database to store route coordinates, user profiles, and bookmark data.
* **Spatial Processing:** Custom geospatial utility functions validate incoming coordinates against established route paths to prevent fraudulent or inaccurate location reports.

## Prerequisites
To run this project locally, ensure you have the following installed on your machine:
* Node.js (version 18 or higher recommended)
* PostgreSQL database server
* The Expo Go app installed on your personal iOS or Android device

## Local Environment Setup

### 1. Database Configuration
1. Ensure your PostgreSQL server is running.
2. Create a new database for the project.
3. In the `backend` directory, create a `.env` file.
4. Add your database connection string to the `.env` file in the following format: `DATABASE_URL=postgres://username:password@localhost:5432/geobus`
5. Run the provided database seed script to populate the initial tables and route coordinates by executing `node seed.js` in your terminal.

### 2. Backend Initialization
1. Open a terminal window and navigate to the `backend` directory.
2. Install the necessary Node packages by running `npm install`.
3. Start the server by running `npm start` (or `node server.js`).
4. The server will initialize, connect to the database, and begin listening for WebSocket connections.

### 3. Frontend Initialization
1. Open a separate terminal window and navigate to the `frontend` directory.
2. Run `npm install` to download all React Native and Expo dependencies.
3. Start the Expo development server by executing `npm start`.

## How to Test on Your Phone via Expo Go
Once the frontend development server is running, you can test the application directly on your physical mobile device.

1. Ensure your mobile phone and your computer are connected to the same local Wi-Fi network.
2. When you ran `npm start` in the frontend directory, a Metro bundler interface should have opened in your terminal or web browser, displaying a large QR code.
3. Open the Expo Go app on your mobile device.
4. If you are using an Android device, tap the "Scan QR Code" button within the Expo Go app and point your camera at the QR code on your screen.
5. If you are using an iOS device, open your default Camera app, point it at the QR code, and tap the prompt that appears at the top of the screen to open the project in Expo Go.
6. The application bundle will compile and launch on your phone. You can now interact with the app, select roles, and test the application.

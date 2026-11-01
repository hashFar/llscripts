# Logic Lagao Scripts

A web-based script management platform developed for **Logic Lagao**, a YouTube channel. The website helps manage video scripts in one place, track their progress, and organize them using status-based filters.

**Live Website:** - https://hashfar.github.io/llscripts/

## Overview
Logic Lagao Scripts is a lightweight web application built to simplify script management. It provides a centralized platform where authenticated users can create, view, edit, organize, and track scripts throughout their workflow.

The project focuses on a clean interface, real-time database operations, user authentication, and easy script management.

## Features
- **User Authentication:** Sign up and log in using email and password.
- **Script Management:** Create, view, edit, and manage scripts.
- **Status Tracking:** Track script approval and completion status.
- **Status Filters:** Filter scripts by All, Not Approved, Approved, Not Done, Done, and Rejected.
- **Comments:** Authenticated users can comment on scripts.
- **Creator Information:** Display the email of the user who created a script.
- **Database Integration:** Store scripts and related information in Supabase.
- **Responsive Interface:** Access the website through a modern web browser.
- **Theme Support:** Switch between dark and light themes.
- **Persistent Preferences:** Save the selected theme locally using browser local storage.
- **GitHub Pages Deployment:** Host the frontend publicly without managing a separate application server.

## Tech Stack
| Technology | Purpose |
|---|---|
| HTML5 | Structure of the website |
| CSS3 | Styling, layouts, and themes |
| JavaScript | Application logic and interactivity |
| Supabase | Backend services and database |
| Supabase Auth | Email and password authentication |
| PostgreSQL | Database used by Supabase |
| Git and GitHub | Version control and source code hosting |
| GitHub Pages | Frontend deployment |

## Project Structure

The project follows a modular, single-page frontend architecture. HTML, CSS, and JavaScript are separated into dedicated files based on their responsibilities, making the code easier to maintain and extend.

```text
llscripts/
│
├── index.html
│
├── assets/
│   └── logo.jpg
│
├── css/
│   ├── main.css
│   ├── variables.css
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   ├── login.css
│   ├── scripts.css
│   ├── comments.css
│   └── responsive.css
│
├── js/
│   ├── app.js
│   │
│   ├── config/
│   │   └── supabase.js
│   │
│   ├── state/
│   │   └── store.js
│   │
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── scripts.service.js
│   │   ├── comments.service.js
│   │   ├── reactions.service.js
│   │   └── profiles.service.js
│   │
│   ├── features/
│   │   ├── auth.js
│   │   ├── theme.js
│   │   ├── navigation.js
│   │   ├── scripts.js
│   │   ├── filters.js
│   │   ├── comments.js
│   │   ├── reactions.js
│   │   └── archive.js
│   │
│   ├── ui/
│   │   ├── script-card.js
│   │   ├── comment-card.js
│   │   ├── modal.js
│   │   └── helpers.js
│   │
│   └── views/
│       ├── home.view.js
│       ├── scripts.view.js
│       └── archive.view.js
│
└── README.md
```

### Folder Responsibilities

- **assets/** – Images and other static assets.
- **css/** – Stylesheets organised by UI component and responsibility.
- **config/** – Supabase client configuration.
- **state/** – Shared application state and caches.
- **services/** – Supabase database operations and authentication services.
- **features/** – Application functionality and event handling.
- **ui/** – Reusable UI components and helper functions.
- **views/** – Rendering of different application sections.
- **app.js** – Main JavaScript entry point that initialises the application.
- **index.html** – Main application structure.

The frontend communicates directly with Supabase using its JavaScript client library, loaded through a CDN. A separate Node.js or Spring Boot backend is not required for this architecture.

## How the Application Works

### 1. Authentication
Users sign up or log in using email and password. Supabase Auth handles authentication and maintains the user's session.

### 2. Loading Scripts
JavaScript retrieves script records from the Supabase database and displays them on the website.

### 3. Creating and Editing Scripts
Users interact with the interface to add or update script information. JavaScript sends the corresponding database operations to Supabase.

### 4. Managing Status
Scripts have approval and completion states. Users can use filters to find scripts based on their current status.

### 5. Comments
Authenticated users can add comments to scripts. Comment records are stored in the database and displayed with relevant author and timestamp information.

### 6. Data Security
Supabase Row Level Security (RLS) policies control which database operations authenticated users are allowed to perform. Actual permissions depend on the policies configured in the Supabase project.

The Supabase service-role key must never be exposed in frontend code. Only the public project URL and publishable/legacy anon key should be used in the browser, alongside correctly configured database security policies.

### 7. Deployment
The frontend is hosted using GitHub Pages. The browser loads the website's static files, and the JavaScript client communicates with Supabase for authentication and database operations.

## How to Run Locally

### Prerequisites
- A modern web browser
- Git
- A Supabase account and project

### Step 1: Clone the Repository
```bash
git clone https://github.com/hashFar/llscripts.git
cd llscripts
```

### Step 2: Configure Supabase
1. Open your project in the Supabase dashboard.
2. Obtain the project URL and publishable key (or legacy anon key).
3. Open `index.html`.
4. Locate the existing Supabase client initialization.
5. Configure the correct project URL and public key.
6. Ensure the required database tables and RLS policies are configured.

Do not commit secret keys or service-role credentials to the repository.

### Step 3: Run the Website
Open `index.html` in a browser, or use the **Live Server** extension in VS Code for local development.

The website requires an internet connection to communicate with Supabase.

## Deployment
The project is deployed using GitHub Pages.

To update the live website:

1. Make the required changes to the project files.
2. Test the website locally.
3. Commit and push the changes to GitHub.
4. Ensure GitHub Pages is configured for the correct repository branch and folder.
5. Open the live website and verify the changes.


## Future Improvements

- Add pagination for large script collections.
- Improve search and sorting.
- Add richer script editing and collaboration tools.
- Introduce more detailed activity tracking.
- Improve accessibility and mobile usability.

## License

This project was developed for Logic Lagao. No open-source license is specified in this repository.
---

**Developed by:** HashFar

**Project Type:** Client Website

**Category:** Web Development · Script Management · Supabase Integration

# EduRate – Course Rating & Feedback Portal

EduRate is a web-based course rating and feedback portal designed to help students share feedback on courses and instructors. It provides a structured way to manage course information, collect ratings and reviews, and view feedback analytics.

## Features

- **Role-based access:** Supports student, instructor, and administrator roles.
- **Course management:** Organizes course details, departments, categories, and instructor information.
- **Ratings and reviews:** Supports course ratings and detailed feedback.
- **Feedback analytics:** Provides rating distributions, department comparisons, review trends, and instructor-rating insights.
- **REST API:** Uses Express.js routes to handle authentication, courses, reviews, and users.
- **Database integration:** Uses MongoDB and Mongoose for data storage.
- **Responsive web interface:** Includes frontend HTML, CSS, and JavaScript files.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Authentication | JSON Web Tokens (JWT), bcryptjs |
| Configuration | Environment variables, dotenv package |

## Project Structure

```text
FSD2/
└── course-portal/
    ├── controllers/
    │   ├── authController.js
    │   ├── courseController.js
    │   ├── reviewController.js
    │   └── userController.js
    ├── middleware/
    │   └── auth.js
    ├── models/
    │   ├── Course.js
    │   ├── Review.js
    │   └── User.js
    ├── routes/
    │   ├── auth.js
    │   ├── courses.js
    │   ├── reviews.js
    │   └── users.js
    ├── public/
    │   ├── css/
    │   │   └── style.css
    │   ├── js/
    │   │   └── app.js
    │   └── index.html
    ├── .gitignore
    ├── package.json
    ├── package-lock.json
    ├── server.js
    └── README.md
```

## Getting Started

### Prerequisites

Install the following before running the project:

- Node.js and npm
- MongoDB, either locally or through MongoDB Atlas
- Git

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/24pa1a05d2/FSD2.git
```

**2. Navigate to the project directory**

```bash
cd FSD2/course-portal
```

**3. Install dependencies**

```bash
npm install
```

**4. Configure environment variables**

Configure the following variables in your hosting platform or local environment:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
```

For local `.env` file support, ensure `require('dotenv').config();` is placed at the beginning of `server.js`, before the environment variables are accessed.

Use your own MongoDB connection string and a strong, private JWT secret.

**5. Start the application**

```bash
npm start
```

Open the application at:

```text
http://localhost:5000
```

The server can also start in demo mode if the MongoDB connection fails. Database-dependent functionality requires a working database connection.

## API Overview

| Endpoint | Purpose |
|---|---|
| `/api/auth` | Authentication routes |
| `/api/courses` | Course-related operations |
| `/api/reviews` | Course reviews and ratings |
| `/api/users` | User-related operations |
| `/api/status` | Server and database connection status |
| `/api/analytics` | Feedback and rating analytics |
| `/api/seed` | Creates sample data for demonstration |

The API routes are mounted in `server.js`. Refer to the corresponding files in the `routes/` directory for individual operations.

## Deployment

The application can be deployed as a Node.js web service on a platform such as Render.

Recommended configuration:

- **Repository:** `24pa1a05d2/FSD2`
- **Branch:** `main`
- **Root directory:** `course-portal`
- **Build command:** `npm install`
- **Start command:** `npm start`

Configure `MONGODB_URI` and `JWT_SECRET` in the deployment platform's environment variables. A hosted MongoDB database is required for persistent database functionality.

## Security Notes

- Never commit `.env` files, database credentials, or private secrets to GitHub.
- Use a strong `JWT_SECRET` in production.
- Protect or disable the `/api/seed` endpoint before production use. The current implementation deletes existing reviews, courses, and users before inserting demonstration data.
- Do not rely on demo mode for persistent data storage.

## Repository

GitHub: https://github.com/24pa1a05d2/FSD2

## Author

**Your Name**


# Cafe Management System

A web-based Cafe Management System developed using ASP.NET Core MVC, ASP.NET Core Web API, C#, Entity Framework Core, and SQL Server. The application helps manage cafe operations through a centralized interface.

## Project Overview

The Cafe Management System provides a web interface for managing menu items, categories, tables, customers, orders, kitchen operations, payments, billing, and reports.

The solution separates the MVC presentation layer, API controllers, core entities and DTOs, and infrastructure and database operations.

Key Features

* Authentication and Authorization: JWT-based API authentication and role-based authorization policies.
* Dashboard: Overview of cafe operations.
* Menu Management: Manage menu items and categories.
* Table Management: Manage cafe tables and their availability.
* Customer Management: Create, view, and update customer information.
* Order Management: Create and manage customer orders and order statuses.
* Kitchen Management: View and manage kitchen orders.
* Billing and Invoicing: View order bills and payment information.
* Payment Management: Manage payments and payment statuses.
* Reports: Access operational reports.
* Data Validation: Validate incoming data using DTOs and validation attributes.

*Features listed above should reflect the functionality implemented in the submitted version.*

## Technologies Used

## Backend

* C#
* ASP.NET Core Web API
* ASP.NET Core MVC
* Entity Framework Core
* SQL Server / LocalDB
* ASP.NET Core Identity
* JWT authentication and authorization
* Swagger / OpenAPI

## Frontend

* HTML5
* CSS3
* JavaScript
* Bootstrap 5
* Razor Views

## Development Tools

* Visual Studio
* Git
* GitHub

## Project Architecture

The solution is organized into the following projects:

| Project                               | Responsibility                                                  |
| ------------------------------------- | --------------------------------------------------------------- |
| `CafeManagementSystem`                | ASP.NET Core MVC application and user interface                 |
| `CafeManagementSystem.API`            | REST API endpoints and request handling                         |
| `CafeManagementSystem.Core`           | Entities, DTOs, and enums                                       |
| `CafeManagementSystem.Infrastructure` | Database context, migrations, identity, and data initialization |
| `CafeManagementSystem.Tests`          | Automated test project                                          |

## Prerequisites

Before running the project, install:

* Visual Studio with the ASP.NET and web development workload
* The .NET SDK compatible with the project files
* SQL Server LocalDB or a compatible SQL Server instance
* Git

## Database Configuration

The development configuration uses SQL Server LocalDB.

The API database connection string is configured in:

`CafeManagementSystem.API/appsettings.json`

Update the connection string if you use a different SQL Server instance.

Entity Framework Core migrations are included in the Infrastructure project.

Before running the application against a new database, ensure that the database schema is created using the project's migrations.

## Authentication Configuration

The API uses JWT authentication and authorization policies.

Configure the following settings for local development:

* `Jwt:Issuer`
* `Jwt:Audience`
* `Jwt:ExpiryMinutes`
* `Jwt:Key`

Keep the JWT signing key in .NET User Secrets during development. Do not commit secrets, passwords, or production credentials to GitHub.

The API also uses role-based authorization policies for protected endpoints.

## How to Run the Project

### 1. Clone the repository

```bash
git clone https://github.com/yash8750/CafeManagementSystem.git
```

### 2. Open the solution

Open `CafeManagementSystem.slnx` in Visual Studio.

### 3. Configure the database

Verify the API database connection string and apply the required Entity Framework Core migrations to your database.

### 4. Configure JWT User Secrets

From the API project directory, initialize User Secrets if necessary:

```bash
dotnet user-secrets init
```

Set the JWT signing key using a securely generated value:

```bash
dotnet user-secrets set "Jwt:Key" "YOUR_GENERATED_SECRET"
```

Set any additional configuration values required by the application's initialization code.

Never replace the placeholder with a real secret in this README or commit the secret to source control.

### 5. Start the applications

Configure Visual Studio to start both the MVC application and the API project.

The current local development URLs are:

* MVC: `https://localhost:7048`
* API: `https://localhost:7159`

If the ports differ on your computer, use the URLs configured in the respective launch settings.

### 6. Sign in

Open the MVC application in your browser and sign in using an account configured for the application.

## Repository

GitHub: https://github.com/yash8750/CafeManagementSystem

## Future Enhancements

* Cloud deployment with a production SQL Server database
* Additional automated test coverage
* Enhanced analytics and reporting
* Further improvements to security, accessibility, and user experience

## Author

Developed as a full-stack .NET project demonstrating web application development, REST API integration, database operations, authentication, and cafe management workflows.

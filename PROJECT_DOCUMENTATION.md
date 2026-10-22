# Cafe Management System

## 1. Project Overview

The Cafe Management System is a full-stack web application designed to simplify and manage the daily operations of a cafe. It provides a centralized platform for managing menu items, categories, tables, customers, orders, kitchen operations, payments, billing, and sales reports.

The application uses a web-based MVC frontend connected to a RESTful Web API. The backend processes business operations and interacts with the database through Entity Framework Core.

## 2. Project Links

* **Live Application:** https://managecafe.runasp.net
* **Backend API:** https://managecafeapi.runasp.net
* **GitHub Repository:** https://github.com/yash8750/CafeManagementSystem

## 3. Technology Stack

### Backend

* C#
* ASP.NET Core MVC
* ASP.NET Core Web API
* Entity Framework Core
* RESTful API architecture
* JWT-based authentication

### Frontend

* HTML5
* CSS3
* JavaScript
* Bootstrap
* Razor Views (`.cshtml`)
* Bootstrap Icons

### Database

* Microsoft SQL Server
* Entity Framework Core for database access

### Development and Deployment

* Visual Studio
* Git and GitHub
* MonsterASP.NET hosting
* Environment-based application configuration

## 4. System Architecture

The application follows a layered architecture that separates the user interface, API endpoints, core application models, and database access.

### MVC Presentation Layer

The MVC application provides the user interface through Razor Views, CSS, JavaScript, and Bootstrap. JavaScript communicates with the backend API to retrieve and update application data.

### API Layer

The ASP.NET Core Web API exposes HTTP endpoints for application operations. Controllers handle incoming requests, validate input, enforce applicable authorization policies, execute business operations, and return HTTP responses.

### Core Layer

The Core project contains shared application components such as domain models, DTOs, enums, and other business-related types.

### Infrastructure Layer

The Infrastructure project contains database-related components, including Entity Framework Core configuration and the database context.

### Database Layer

Microsoft SQL Server stores the application's persistent information, including customers, categories, menu items, tables, orders, and payment records.

### Request Flow

1. A user interacts with the MVC frontend.
2. JavaScript sends an HTTP request to the API.
3. The API processes and validates the request.
4. Entity Framework Core communicates with SQL Server.
5. The API returns a response.
6. The frontend displays the result to the user.

## 5. Main Features and Modules

### Authentication

* User login.
* JWT-based authentication.
* Role-based authorization where configured.
* Client-side session management.
* Logout functionality.

### Dashboard

* Overview of cafe operations.
* Summary information retrieved from the reporting API.
* Dashboard refresh functionality.

### Menu Management

* Create and manage menu items.
* Retrieve menu items.
* Update and delete menu items.
* Associate menu items with categories.

### Category Management

* Manage menu categories.
* Organize menu items by category.

### Table Management

* Manage cafe tables.
* Track table availability and status.
* Apply business rules to protect tables associated with active orders.

### Customer Management

* Create and maintain customer records.
* Retrieve and update customer information.
* Validate customer input.

### Order Management

* Create dine-in and takeaway orders.
* Associate orders with customers, tables, and menu items where applicable.
* Track order status.
* Calculate order totals, taxes, and applicable amounts.

### Kitchen Order Management

* Retrieve orders eligible for kitchen processing.
* Track kitchen workflow through supported order statuses.
* Update order progress.

### Billing and Invoicing

* Retrieve billing information for orders.
* Calculate bill totals.
* Generate invoices for completed orders.

### Payment Management

* Record payments against eligible orders.
* Track payment methods and payment status.
* Maintain transaction references where applicable.

### Sales Reports

* Retrieve dashboard statistics and sales information.
* Review sales and revenue data through reporting endpoints.

## 6. Order Workflow

The order workflow supports the following status progression:

**Pending → Confirmed → Preparing → Ready → Completed**

The application applies business rules to control supported status transitions and related operations.

For example, an order must be completed before its payment can be recorded, according to the implemented payment workflow.

## 7. Authentication and Security

The application uses JWT-based authentication for API access.

Security-related implementation includes:

* Authentication endpoints.
* Authorization attributes and policies on protected API endpoints.
* Input validation through DTOs and data annotations where implemented.
* CORS configuration for the deployed MVC application.
* Environment-specific configuration for deployment.
* Exclusion of local configuration and publish-profile files from source control.

Production credentials and secrets should be provided through secure deployment configuration rather than committed to the repository.

## 8. Database and Data Access

Microsoft SQL Server is used for persistent data storage.

Entity Framework Core provides object-relational mapping and database access through the Infrastructure layer.

The database context coordinates access to application entities. DTOs are used where appropriate to define the data accepted or returned by API endpoints.

## 9. API Integration

The MVC frontend communicates with the deployed backend through HTTP requests.

The API provides endpoints for the application's main modules, including:

* Authentication
* Menu items
* Categories
* Customers
* Tables
* Orders
* Kitchen operations
* Billing and invoices
* Payments
* Reports

The API uses standard HTTP methods such as GET, POST, PUT, and DELETE where supported by individual endpoints.

The API is hosted separately from the MVC application, allowing the frontend and backend to be deployed independently.

## 10. Validation and Error Handling

The application uses validation and business rules to prevent invalid operations.

Examples include:

* Required-field validation.
* Input length and format validation where configured.
* Restrictions on deleting tables associated with active orders.
* Restrictions on recording payments

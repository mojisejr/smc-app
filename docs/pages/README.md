# Smart Medication Cart (SMC) - Page Documentation

## Overview
This directory contains comprehensive documentation for each page and component in the Smart Medication Cart application. Each document provides detailed technical specifications, database interactions, user interface details, and integration information.

## Documentation Structure

### Page Documentation Files
1. **[01_app-root.md](./01_app-root.md)** - Application Root (`_app.tsx`)
2. **[02_home-page.md](./02_home-page.md)** - Home Page (`home.tsx`)
3. **[03_activation-key-page.md](./03_activation-key-page.md)** - Activation Key Page (`activate-key.tsx`)
4. **[04_settings-page.md](./04_settings-page.md)** - Settings Page (`setting.tsx`)
5. **[05_logs-page.md](./05_logs-page.md)** - Logs Page (`logs.tsx`)
6. **[06_management-page.md](./06_management-page.md)** - Management Page (`management/index.tsx`)
7. **[07_about-page.md](./07_about-page.md)** - About Page (`about.tsx`)
8. **[08_document-page.md](./08_document-page.md)** - Document Page (`document.tsx`)
9. **[09_error-page.md](./09_error-page.md)** - Error Page (`error/index.tsx`)

## Document Format

Each page documentation includes:

### Technical Specifications
- **File Location**: Exact file path in the project
- **Purpose**: Primary functionality and goals
- **Component Structure**: Code architecture and organization
- **Database Connections**: Data operations and table interactions
- **IPC Communication**: Inter-process communication channels

### User Interface Details
- **Layout Design**: Visual structure and organization
- **User Interactions**: Available actions and workflows
- **Visual Elements**: Styling and design components
- **Accessibility Features**: Usability and compliance

### Integration Information
- **Hardware Interface**: Device communication and control
- **Security Features**: Access control and data protection
- **Performance Considerations**: Optimization and efficiency
- **Error Handling**: Failure management and recovery

## Application Architecture Overview

### Frontend Structure (Renderer Process)
```
renderer/
├── pages/
│   ├── _app.tsx           # Application root wrapper
│   ├── home.tsx           # Main slot grid dashboard
│   ├── activate-key.tsx   # License activation
│   ├── setting.tsx        # System configuration
│   ├── logs.tsx           # Dispensing history
│   ├── about.tsx          # System information
│   ├── document.tsx       # User documentation
│   ├── management/
│   │   └── index.tsx      # Admin dashboard
│   └── error/
│       └── index.tsx      # Error handling
├── components/            # Reusable UI components
├── contexts/              # Global state management
├── hooks/                 # Custom React hooks
└── interfaces/            # TypeScript definitions
```

### Backend Structure (Main Process)
```
main/
├── background.ts          # Application entry point
├── auth/                  # Authentication system
├── ku16/                  # Hardware device interface
├── setting/               # Configuration management
├── user/                  # User management
├── logger/                # Logging system
└── license/               # License validation
```

### Database Schema
```
database.db
├── User                   # User accounts and authentication
├── Slot                   # Medication slot configuration
├── Setting                # System configuration
├── DispensingLog          # Medication dispensing history
└── Log                    # System event logging
```

## Navigation Flow

### Primary User Journey
1. **Application Start** → License check → Home page
2. **Home Page** → Slot grid display → Dispensing workflow
3. **Authentication** → User verification → Slot access
4. **Dispensing** → Hardware control → Log creation

### Administrative Journey
1. **Home Page** → Admin authentication → Management dashboard
2. **Management** → Tab selection → Specific admin functions
3. **Configuration** → System settings → Hardware reinitialization

### Information Access
1. **Navigation Sidebar** → Page selection → Content display
2. **Documentation** → User manual → Troubleshooting
3. **Logs** → History review → Audit compliance

## Database Interaction Patterns

### Read Operations
- **Real-time Status**: Slot table for current hardware state
- **User Information**: User table for authentication and display
- **Configuration**: Setting table for system parameters
- **History**: Log tables for audit trails and analysis

### Write Operations
- **Dispensing Events**: DispensingLog entries for each medication access
- **System Changes**: Setting table updates for configuration
- **User Management**: User table modifications for account administration
- **Event Logging**: Log table entries for system events

### Data Relationships
- **User ↔ DispensingLog**: Track who performed dispensing operations
- **Slot ↔ Hardware**: Real-time synchronization with physical devices
- **Setting ↔ System**: Configuration parameters control system behavior

## IPC Communication Patterns

### Hardware Control
- **Device Commands**: Slot unlock/lock operations
- **Status Updates**: Real-time hardware state synchronization
- **Error Handling**: Hardware failure detection and recovery

### Data Management
- **Database Operations**: CRUD operations on all tables
- **Configuration Updates**: System setting modifications
- **User Management**: Account creation, modification, deletion

### System Control
- **Authentication**: Login/logout and session management
- **Logging**: Event recording and audit trail creation
- **Initialization**: System startup and hardware configuration

## Security Architecture

### Access Control
- **Role-based Permissions**: Admin vs. regular user privileges
- **Authentication**: Passkey-based user verification
- **Session Management**: Secure session handling and timeouts

### Data Protection
- **Audit Trails**: Complete operation logging for compliance
- **Secure Storage**: Encrypted passkey storage
- **Transaction Integrity**: Atomic database operations

### Hardware Security
- **Physical Locks**: Electromechanical slot security
- **Communication Encryption**: Secure device protocols
- **Access Monitoring**: Real-time security status

## Performance Optimization

### Frontend Performance
- **Component Optimization**: Efficient React rendering
- **State Management**: Optimized context usage
- **Real-time Updates**: Efficient hardware state synchronization

### Backend Performance
- **Database Optimization**: Indexed queries and efficient operations
- **Hardware Communication**: Async device operations
- **Memory Management**: Efficient resource utilization

### System Performance
- **Startup Time**: Fast application initialization
- **Response Time**: Quick user interaction feedback
- **Scalability**: Support for multiple concurrent users

## Compliance and Regulations

### Healthcare Standards
- **Audit Requirements**: Complete operation logging
- **Data Privacy**: Patient information protection
- **Access Control**: Regulated user authentication

### Software Licensing
- **Activation System**: License key validation
- **Usage Tracking**: Compliance monitoring
- **Customer Management**: Organization tracking

## Development Guidelines

### Code Organization
- **Component Structure**: Consistent React component patterns
- **Database Operations**: Standardized data access patterns
- **Error Handling**: Comprehensive error management
- **Documentation**: Inline code documentation

### Quality Assurance
- **Testing Strategy**: Component and integration testing
- **Code Review**: Systematic code quality checks
- **Performance Monitoring**: System performance tracking
- **Security Auditing**: Regular security assessments

## Maintenance and Support

### System Maintenance
- **Database Optimization**: Regular performance tuning
- **Log Management**: Automated log rotation and archival
- **Update Procedures**: System and security updates
- **Backup Strategies**: Data protection and recovery

### User Support
- **Documentation**: Comprehensive user guides
- **Troubleshooting**: Systematic problem resolution
- **Training**: User education and certification
- **Help Desk**: Technical support procedures

This documentation serves as a comprehensive reference for developers, administrators, and support personnel working with the Smart Medication Cart system.
# Application Root Page (`_app.tsx`)

## Overview
The main application wrapper that provides global context and styling for the entire Smart Medication Cart application.

## File Location
`renderer/pages/_app.tsx`

## Purpose
- Global application initialization
- Context provider setup
- Global styling application
- Component wrapping for all pages

## Key Features

### Context Providers
1. **ErrorProvider**: Global error handling and display
2. **AppProvider**: Application state management (admin status, activation)
3. **DispensingProvider**: Medication dispensing workflow state

### Global Styling
- TailwindCSS global styles
- React Toastify CSS
- Custom component styling

## Component Structure
```tsx
function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ErrorProvider>
      <AppProvider>
        <DispensingProvider>
          <Component {...pageProps} />
        </DispensingProvider>
      </AppProvider>
    </ErrorProvider>
  );
}
```

## Database Connections
**None** - This is a client-side wrapper component that doesn't directly interact with the database.

## IPC Communication
**None** - No direct IPC calls, but provides context for child components that use IPC.

## Context Data Flow

### AppProvider Context
- `admin`: Current admin user (string | null)
- `isActivated`: License activation status (boolean)
- `setAdmin`: Function to set admin user

### DispensingProvider Context
- `passkey`: Current user passkey for dispensing
- `setPasskey`: Function to set passkey

### ErrorProvider Context
- Global error state management
- Error display and handling

## Usage Patterns
1. **Page Navigation**: All page components receive this context automatically
2. **Global State**: Shared state accessible throughout the application
3. **Error Handling**: Centralized error management
4. **Authentication**: Admin status tracking across pages

## Dependencies
- Next.js App component structure
- React Context API
- Global CSS frameworks
- Application-specific contexts

## Integration Points
- Wraps all page components
- Provides context to navigation components
- Enables global state management
- Handles application-wide error states
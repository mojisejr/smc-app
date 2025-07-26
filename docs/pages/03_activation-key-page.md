# Activation Key Page (`activate-key.tsx`)

## Overview
Software license activation page that validates and activates the Smart Medication Cart application using a provided activation key.

## File Location
`renderer/pages/activate-key.tsx`

## Purpose
- Validate software license activation keys
- Initialize application licensing
- Prevent unauthorized software usage
- Redirect to main application after activation

## Key Features

### License Validation
- **Input Field**: Secure activation key entry
- **Validation**: Server-side key verification
- **Error Handling**: Invalid key feedback
- **Success Confirmation**: Activation status display

### Form Controls
- **React Hook Form**: Form state management
- **Loading States**: Processing indicators
- **Submit Handling**: Async activation process
- **Input Validation**: Required field checking

## Component Structure
```tsx
export default function ActivatePage() {
  const { replace } = useRouter();
  const { register, handleSubmit } = useForm<inputType>();
  const [isLoading, setLoading] = useState<boolean>(false);

  const onSubmit = handleSubmit(async (data: inputType) => {
    // Activation logic
  });

  return (
    <div className="w-full flex h-screen justify-center items-center">
      <form onSubmit={onSubmit}>
        <input {...register("key", { required: true })} />
        <button type="submit">Activate</button>
      </form>
    </div>
  );
}
```

## Database Connections

### Write Operations
- **Setting Table**: Updates activation status
  - `activated_key`: Stores validated activation key
  - `organization`: Customer organization name
  - `customer_name`: Licensed customer information

### Read Operations
- **Setting Table**: Checks current activation status
  - Verifies existing activation
  - Retrieves customer information

## IPC Communication

### Outgoing Channels
- **`activate-key`**: Send activation key for validation
  - Parameters: `{ key: string }`
  - Returns: `boolean` (activation result)

- **`check-activation-key`**: Verify current activation status
  - Parameters: None
  - Returns: `boolean` (activation status)

### Activation Flow
1. User enters activation key
2. Form submits to `activate-key` IPC channel
3. Main process validates key with license server
4. Database updated with activation status
5. Success confirmation displayed
6. Automatic redirect to home page

## User Interface

### Form Layout
- **Centered Design**: Full-screen centered form
- **Input Field**: Wide activation key input (600px)
- **Submit Button**: Primary action button
- **Loading State**: Processing indicator
- **Error Messages**: Thai language feedback

### Visual Elements
- **Typography**: Label text in Thai
- **Styling**: DaisyUI form components
- **Spacing**: Proper form element spacing
- **Responsiveness**: Mobile-friendly design

## Error Handling

### Validation Errors
- **Empty Key**: "กรุณาใส่ Activation key" (Please enter activation key)
- **Invalid Key**: "ไม่สามารถ activate ได้" (Cannot activate)
- **Network Errors**: Connection failure handling
- **Server Errors**: License server communication issues

### Success Handling
- **Confirmation**: "Activate สำเร็จ ออกจากโปรแกรมแล้วเข้าใหม่อีกครั้ง" (Activation successful, restart application)
- **Automatic Redirect**: Navigate to home page
- **License Storage**: Persistent activation status

## Security Features

### License Protection
- **Key Validation**: Server-side verification
- **Encryption**: Secure key storage
- **Tamper Detection**: Activation integrity checks
- **Expiration**: Time-based license validation

### Data Security
- **Secure Transmission**: Encrypted key communication
- **Local Storage**: Protected activation data
- **Authentication**: License server validation
- **Audit Trail**: Activation logging

## Integration Points

### License Server
- **API Communication**: Remote license validation
- **Customer Database**: Organization verification
- **Key Management**: Activation key lifecycle
- **Compliance**: License term enforcement

### Application Flow
- **Entry Point**: Application startup check
- **Blocking**: Prevents unauthorized usage
- **Initialization**: Post-activation setup
- **Routing**: Conditional navigation

## Configuration

### Environment Variables
- **License Server URL**: Remote validation endpoint
- **Customer ID**: Organization identifier
- **Product Code**: Application identifier
- **Version**: License version compatibility

### Settings Integration
- **Database Storage**: Persistent activation state
- **Configuration**: License-based feature enabling
- **Customer Info**: Organization data storage
- **Expiration**: License term tracking

## Usage Patterns

### First-Time Users
1. Application starts
2. No valid license detected
3. Redirected to activation page
4. Enter provided activation key
5. Validation and activation
6. Access granted to main application

### Re-activation
1. License expires or becomes invalid
2. Automatic redirect to activation
3. Enter new or updated key
4. Validation and re-activation
5. Continued application access

## Compliance Features
- **License Tracking**: Usage monitoring
- **Customer Verification**: Organization validation
- **Audit Logging**: Activation attempts
- **Compliance Reporting**: License usage data
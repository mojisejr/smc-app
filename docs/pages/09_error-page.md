# Error Page (`error/index.tsx`)

## Overview
Centralized error handling and display page for managing application errors, system failures, and providing user guidance for error recovery.

## File Location
`renderer/pages/error/index.tsx`

## Purpose
- Display system and application errors
- Provide error recovery guidance
- Offer troubleshooting information
- Handle graceful error degradation

## Key Features

### Error Display
- **Error Message**: Clear error description
- **Error Code**: System error identification
- **Timestamp**: When error occurred
- **Context Information**: Relevant system state

### Recovery Options
- **Retry Actions**: Attempt operation again
- **Alternative Workflows**: Fallback procedures
- **Contact Support**: Help and support information
- **Navigation Options**: Return to working areas

## Component Structure
```tsx
function ErrorPage() {
  const router = useRouter();
  const { error } = router.query;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <div className="error-icon">
          <svg className="h-16 w-16 text-red-500 mx-auto">
            {/* Error icon */}
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mt-4">
          เกิดข้อผิดพลาด
        </h1>
        
        <p className="text-gray-600 mt-2">
          {getErrorMessage(error)}
        </p>
        
        <div className="mt-6 space-y-3">
          <button onClick={handleRetry} className="btn btn-primary">
            ลองใหม่อีกครั้ง
          </button>
          
          <button onClick={handleGoHome} className="btn btn-outline">
            กลับสู่หน้าหลัก
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Database Connections

### Error Logging
- **Log Table**: Error event recording
  - `user`: Current user when error occurred
  - `message`: Error description and details
  - `createdAt`: Error timestamp

### System State Recovery
- **Setting Table**: System configuration verification
- **User Table**: User session validation
- **Slot Table**: Hardware state checking

## Error Categories

### Application Errors
- **Navigation Errors**: Page routing failures
- **Component Errors**: React component failures
- **State Errors**: Context or state management issues
- **Rendering Errors**: UI display problems

### Hardware Errors
- **Communication Failures**: Serial port issues
- **Device Disconnection**: Hardware connectivity loss
- **Timeout Errors**: Operation timeout failures
- **Protocol Errors**: Communication protocol issues

### Database Errors
- **Connection Failures**: Database connectivity issues
- **Query Errors**: SQL execution problems
- **Transaction Failures**: Data operation errors
- **Integrity Violations**: Data consistency issues

### Authentication Errors
- **Login Failures**: User authentication problems
- **Session Expiration**: Timeout-related errors
- **Permission Denied**: Access control violations
- **License Errors**: Activation and licensing issues

## Error Messages (Thai Language)

### Common Error Messages
- **Connection Error**: "ไม่สามารถเชื่อมต่อกับระบบได้"
- **Authentication Error**: "การยืนยันตัวตนล้มเหลว"
- **Hardware Error**: "อุปกรณ์ไม่สามารถใช้งานได้"
- **Database Error**: "ข้อมูลไม่สามารถโหลดได้"
- **Permission Error**: "ไม่มีสิทธิ์เข้าถึงฟังก์ชันนี้"

### Technical Error Codes
- **ERR_001**: Database connection failure
- **ERR_002**: Hardware communication timeout
- **ERR_003**: Authentication token invalid
- **ERR_004**: License activation required
- **ERR_005**: System configuration error

## Recovery Mechanisms

### Automatic Recovery
- **Retry Logic**: Automatic operation retry
- **Fallback Methods**: Alternative execution paths
- **State Reset**: System state restoration
- **Session Recovery**: User session restoration

### User-Guided Recovery
- **Manual Retry**: User-initiated retry actions
- **Alternative Paths**: Different workflow options
- **Support Contact**: Help and assistance
- **System Restart**: Application restart guidance

## Error Context Information

### System State
- **Current User**: Active user information
- **Current Page**: Location when error occurred
- **System Status**: Hardware and software state
- **Recent Actions**: Operations leading to error

### Technical Details
- **Stack Trace**: Development error information
- **Browser Information**: Client environment details
- **System Resources**: Memory and performance data
- **Network Status**: Connectivity information

## User Interface

### Error Display Layout
- **Centered Design**: Full-screen error presentation
- **Clear Typography**: Readable error messages
- **Visual Hierarchy**: Structured information display
- **Professional Styling**: Clean, medical-grade appearance

### Action Buttons
- **Primary Action**: Most likely recovery option
- **Secondary Actions**: Alternative recovery methods
- **Navigation Options**: Return to safe areas
- **Help/Support**: Contact and assistance options

### Visual Elements
- **Error Icons**: Clear visual error indication
- **Color Coding**: Error severity indication
- **Progress Indicators**: Recovery operation progress
- **Success Feedback**: Recovery confirmation

## Error Prevention

### Validation
- **Input Validation**: Prevent invalid data entry
- **State Validation**: Ensure valid system states
- **Permission Checking**: Verify access rights
- **Resource Validation**: Check system resources

### Defensive Programming
- **Error Boundaries**: React error containment
- **Try-Catch Blocks**: Exception handling
- **Null Checking**: Prevent null reference errors
- **Timeout Handling**: Prevent infinite waits

## Logging and Monitoring

### Error Logging
- **Detailed Logs**: Comprehensive error information
- **User Context**: User and session information
- **System State**: Complete system status
- **Recovery Actions**: User recovery attempts

### Error Analytics
- **Error Frequency**: Common error tracking
- **Error Patterns**: Recurring issue identification
- **User Impact**: Error effect on operations
- **System Health**: Overall system reliability

## Integration with Support

### Support Information
- **Contact Details**: Support team contact information
- **Error Reporting**: Automated error reporting
- **Documentation Links**: Relevant help documentation
- **Troubleshooting**: Self-service resolution guides

### Escalation Procedures
- **Severity Assessment**: Error impact evaluation
- **Automatic Escalation**: Critical error handling
- **Manual Escalation**: User-initiated support
- **Follow-up Procedures**: Issue resolution tracking

## Development Support

### Error Boundaries
- **Component Isolation**: Prevent error propagation
- **Graceful Degradation**: Partial functionality preservation
- **Error Information**: Developer debugging information
- **Recovery Strategies**: Automatic error recovery

### Debugging Features
- **Development Mode**: Enhanced error information
- **Console Logging**: Detailed error output
- **State Inspection**: System state examination
- **Performance Monitoring**: Resource usage tracking

## Accessibility Features

### Error Communication
- **Screen Reader**: Accessible error messages
- **High Contrast**: Visible error indication
- **Keyboard Navigation**: Non-mouse error handling
- **Clear Language**: Understandable error descriptions

### Recovery Assistance
- **Multiple Options**: Various recovery methods
- **Clear Instructions**: Step-by-step guidance
- **Progress Feedback**: Recovery operation status
- **Success Confirmation**: Clear resolution indication

## Performance Considerations

### Error Handling Performance
- **Fast Error Display**: Quick error presentation
- **Efficient Recovery**: Optimized recovery operations
- **Memory Management**: Proper resource cleanup
- **Network Efficiency**: Minimal error-related traffic

### System Impact
- **Minimal Disruption**: Isolated error handling
- **Resource Conservation**: Efficient error processing
- **Quick Recovery**: Fast system restoration
- **Continued Operation**: Partial functionality maintenance
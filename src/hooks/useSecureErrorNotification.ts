
export function useSecureErrorNotification() {
  const handleAuthenticationError = async (error: Error, context?: any) => {
    console.error('Authentication error:', error, context);
  };

  const handleInputValidationError = (error: Error, field: string) => {
    console.error('Validation error:', error, 'Field:', field);
  };

  return {
    handleAuthenticationError,
    handleInputValidationError
  };
}

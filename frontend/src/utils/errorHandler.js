export function parseApiError(error) {
  if (error?.response?.data) {
    return error.response.data;
  }
  return { message: error.message || 'An unexpected error occurred.' };
}

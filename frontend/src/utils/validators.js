export function validateEmail(value) {
  if (!value) {
    return 'Email is required.';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return 'Enter a valid email address.';
  }
  return '';
}

export function validatePassword(value) {
  if (!value) {
    return 'Password is required.';
  }
  if (value.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  return '';
}

export function validateName(value) {
  if (!value) {
    return 'This field is required.';
  }
  if (value.length < 2) {
    return 'Enter at least 2 characters.';
  }
  return '';
}

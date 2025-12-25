// Helper utility functions

/**
 * Format a date to YYYY-MM-DD format
 * Handles both Date objects and date strings
 *
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string in YYYY-MM-DD format
 */
const formatDate = (date) => {
  if (!date) return null;

  // If already in YYYY-MM-DD format, return as is
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const dateObj = date instanceof Date ? date : new Date(date);

  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return null;
  }

  // Format to YYYY-MM-DD
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

module.exports = {
  formatDate,
};

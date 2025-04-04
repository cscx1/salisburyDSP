import React, { useState, useEffect } from 'react';

function parseTimeInput(value) {
  if (value.includes(':')) {
    const parts = value.split(':').map(Number);
    if (parts.length === 2 && parts.every(n => !isNaN(n))) {
      const [minutes, seconds] = parts;
      return minutes * 60 + seconds;
    }
    return null;
  } else {
    const num = Number(value);
    return isNaN(num) ? null : num;
  }
}

const TimeInput = ({ value, placeholder, onValidInput, className }) => {
  const [inputValue, setInputValue] = useState(value?.toString() ?? '');

  useEffect(() => {
    setInputValue(value?.toString() ?? '');
  }, [value]);

  const handleBlur = () => {
    const parsed = parseTimeInput(inputValue);
    if (parsed !== null) {
      onValidInput(parsed);
    }
  };

  return (
    <input
      type="text"
      placeholder={placeholder}
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onBlur={handleBlur}
      className={className}
    />
  );
};

export default TimeInput;
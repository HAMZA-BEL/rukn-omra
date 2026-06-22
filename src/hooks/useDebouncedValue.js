import React from "react";

export function useDebouncedValue(value, delay = 200) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebouncedValue;

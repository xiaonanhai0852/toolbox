import { useState, useEffect, useRef } from 'react';

export default function SearchBar({ onSearch }) {
  const [value, setValue] = useState('');
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchRef.current(value);
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <input
      className="search-input"
      type="text"
      placeholder="搜索笔记..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

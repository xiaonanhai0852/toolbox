import { useState, useEffect } from 'react';

export default function SearchBar({ onSearch }) {
  const [value, setValue] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value);
    }, 300);
    return () => clearTimeout(timer);
  }, [value, onSearch]);

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

'use client';

import { useState, useRef, useEffect } from 'react';
import Badge from './Badge';

interface TagFilterProps {
  tags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagFilter({
  tags,
  selectedTags,
  onChange,
  placeholder = 'Search and select tags...',
}: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter tags based on search
  const filteredTags = tags.filter(
    (tag) =>
      tag.toLowerCase().includes(search.toLowerCase()) &&
      !selectedTags.includes(tag)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
    setSearch('');
  };

  const removeTag = (tag: string) => {
    onChange(selectedTags.filter((t) => t !== tag));
  };

  const clearAll = () => {
    onChange([]);
    setSearch('');
  };

  return (
    <div ref={containerRef} className="relative w-full dropdown">
      {/* Selected tags and input */}
      <div
        className="input input-bordered w-full min-h-[3rem] h-auto py-2 cursor-text flex flex-wrap gap-1.5 items-center"
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        {selectedTags.map((tag) => (
          <Badge
            key={tag}
            variant="info"
            className="flex items-center gap-1 pr-1"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="ml-1 hover:bg-info/20 rounded-full p-0.5"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={selectedTags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
        />
        {selectedTags.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearAll();
            }}
            className="btn btn-ghost btn-xs btn-circle"
            title="Clear all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <ul className="dropdown-content menu bg-base-100 rounded-box z-50 mt-1 w-full shadow-lg border border-base-200 max-h-60 overflow-y-auto">
          {filteredTags.length > 0 ? (
            filteredTags.map((tag) => (
              <li key={tag}>
                <button
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="flex items-center justify-between"
                >
                  <span>{tag}</span>
                  <span className="text-base-content/50 text-xs">Click to add</span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-4 py-3 text-sm text-base-content/50 text-center">
              {search ? (
                <>No tags matching "{search}"</>
              ) : tags.length === 0 ? (
                <>No tags available</>
              ) : (
                <>All tags selected</>
              )}
            </li>
          )}

          {/* Quick actions */}
          {tags.length > 0 && selectedTags.length < tags.length && (
            <li className="border-t border-base-200">
              <button
                type="button"
                onClick={() => {
                  onChange([...tags]);
                  setIsOpen(false);
                }}
                className="text-xs text-primary"
              >
                Select all tags
              </button>
            </li>
          )}
        </ul>
      )}

      {/* Summary when closed */}
      {!isOpen && selectedTags.length > 0 && (
        <p className="mt-1 text-xs text-base-content/50">
          {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}

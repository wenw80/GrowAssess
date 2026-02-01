'use client';

import { useState, useRef, useEffect } from 'react';
import { XIcon } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

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

  const filteredTags = tags.filter(
    (tag) =>
      tag.toLowerCase().includes(search.toLowerCase()) &&
      !selectedTags.includes(tag)
  );

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
    <div ref={containerRef} className="relative w-full">
      <div
        className={cn(
          'bg-background border border-input rounded-md w-full min-h-9 py-1.5 px-3 cursor-text',
          'flex flex-wrap gap-1.5 items-center',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          'transition-colors'
        )}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        {selectedTags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="flex items-center gap-1 pr-1"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
            >
              <XIcon className="size-3" />
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
          className="flex-1 min-w-[120px] outline-none text-sm bg-transparent text-foreground placeholder:text-muted-foreground"
        />
        {selectedTags.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearAll();
            }}
            className="rounded-full p-1 hover:bg-muted transition-colors"
            title="Clear all"
          >
            <XIcon className="size-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {isOpen && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-md max-h-60 overflow-y-auto">
          {filteredTags.length > 0 ? (
            filteredTags.map((tag) => (
              <li key={tag}>
                <button
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <span>{tag}</span>
                  <span className="text-muted-foreground text-xs">Click to add</span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-3 text-sm text-muted-foreground text-center">
              {search ? (
                <>No tags matching &quot;{search}&quot;</>
              ) : tags.length === 0 ? (
                <>No tags available</>
              ) : (
                <>All tags selected</>
              )}
            </li>
          )}

          {tags.length > 0 && selectedTags.length < tags.length && (
            <li className="border-t border-border">
              <button
                type="button"
                onClick={() => {
                  onChange([...tags]);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-xs text-primary hover:bg-muted transition-colors"
              >
                Select all tags
              </button>
            </li>
          )}
        </ul>
      )}

      {!isOpen && selectedTags.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}

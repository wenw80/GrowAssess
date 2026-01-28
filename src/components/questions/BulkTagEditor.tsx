'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';

interface BulkTagEditorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedQuestionIds: string[];
  existingTags: string[];
  onSuccess: () => void;
}

export default function BulkTagEditor({
  isOpen,
  onClose,
  selectedQuestionIds,
  existingTags,
  onSuccess,
}: BulkTagEditorProps) {
  const [tagsToAdd, setTagsToAdd] = useState<string[]>([]);
  const [tagsToRemove, setTagsToRemove] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddTag = (tag: string) => {
    if (!tagsToAdd.includes(tag)) {
      setTagsToAdd([...tagsToAdd, tag]);
    }
    // Remove from remove list if it was there
    setTagsToRemove(tagsToRemove.filter(t => t !== tag));
  };

  const handleRemoveTag = (tag: string) => {
    if (!tagsToRemove.includes(tag)) {
      setTagsToRemove([...tagsToRemove, tag]);
    }
    // Remove from add list if it was there
    setTagsToAdd(tagsToAdd.filter(t => t !== tag));
  };

  const handleCreateNewTag = () => {
    const tag = newTagInput.trim();
    if (tag && !tagsToAdd.includes(tag)) {
      setTagsToAdd([...tagsToAdd, tag]);
      setNewTagInput('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/questions/bulk-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds: selectedQuestionIds,
          addTags: tagsToAdd,
          removeTags: tagsToRemove,
        }),
      });

      if (res.ok) {
        onSuccess();
        handleClose();
      } else {
        alert('Failed to update tags');
      }
    } catch (error) {
      console.error('Error updating tags:', error);
      alert('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setTagsToAdd([]);
    setTagsToRemove([]);
    setNewTagInput('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Bulk Tag Editor (${selectedQuestionIds.length} questions)`}
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Add Tags Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Add Tags</h3>

          {/* Create new tag */}
          <div className="flex gap-2 mb-3">
            <Input
              placeholder="Type new tag name..."
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateNewTag();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleCreateNewTag}
              disabled={!newTagInput.trim()}
            >
              Add New
            </Button>
          </div>

          {/* Existing tags to add */}
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2">Or select from existing tags:</p>
            <div className="flex flex-wrap gap-2">
              {existingTags.length === 0 ? (
                <p className="text-sm text-gray-400">No existing tags</p>
              ) : (
                existingTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddTag(tag)}
                    disabled={tagsToAdd.includes(tag) || tagsToRemove.includes(tag)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      tagsToAdd.includes(tag)
                        ? 'bg-green-100 text-green-800 border border-green-300 cursor-not-allowed'
                        : tagsToRemove.includes(tag)
                        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                    {tagsToAdd.includes(tag) && ' ✓'}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Tags to be added */}
          {tagsToAdd.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Will add these tags:</p>
              <div className="flex flex-wrap gap-2">
                {tagsToAdd.map((tag) => (
                  <Badge key={tag} variant="success">
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTagsToAdd(tagsToAdd.filter(t => t !== tag))}
                      className="ml-2 hover:text-red-600"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Remove Tags Section */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Remove Tags</h3>
          <p className="text-xs text-gray-500 mb-2">Select tags to remove from all selected questions:</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {existingTags.length === 0 ? (
              <p className="text-sm text-gray-400">No existing tags</p>
            ) : (
              existingTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  disabled={tagsToRemove.includes(tag) || tagsToAdd.includes(tag)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    tagsToRemove.includes(tag)
                      ? 'bg-red-100 text-red-800 border border-red-300 cursor-not-allowed'
                      : tagsToAdd.includes(tag)
                      ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-red-50'
                  }`}
                >
                  {tag}
                  {tagsToRemove.includes(tag) && ' ✗'}
                </button>
              ))
            )}
          </div>

          {/* Tags to be removed */}
          {tagsToRemove.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Will remove these tags:</p>
              <div className="flex flex-wrap gap-2">
                {tagsToRemove.map((tag) => (
                  <Badge key={tag} variant="danger">
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTagsToRemove(tagsToRemove.filter(t => t !== tag))}
                      className="ml-2 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600">
            {tagsToAdd.length + tagsToRemove.length === 0 ? (
              'No changes to apply'
            ) : (
              <>
                {tagsToAdd.length > 0 && <span>Adding {tagsToAdd.length} tag{tagsToAdd.length !== 1 ? 's' : ''}</span>}
                {tagsToAdd.length > 0 && tagsToRemove.length > 0 && <span>, </span>}
                {tagsToRemove.length > 0 && <span>Removing {tagsToRemove.length} tag{tagsToRemove.length !== 1 ? 's' : ''}</span>}
              </>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              loading={saving}
              disabled={tagsToAdd.length === 0 && tagsToRemove.length === 0}
            >
              Apply Changes
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

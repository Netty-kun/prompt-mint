import { useState } from "react";
import {
  FolderPlus,
  Folder,
  Archive,
  RotateCcw,
  Trash2,
  Pencil,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreatorCollections } from "@/hooks/useCreatorCollections";
import { useWallet } from "@/hooks/useWallet";

export function CollectionListManager() {
  const { address } = useWallet();
  const {
    collections,
    create,
    rename,
    archive,
    unarchive,
    remove,
  } = useCreatorCollections();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  if (!address) return null;

  const handleCreate = () => {
    if (!newName.trim()) return;
    create(newName.trim());
    setNewName("");
  };

  const handleStartRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const handleFinishRename = (id: string) => {
    if (editName.trim()) {
      rename(id, editName.trim());
    }
    setEditingId(null);
    setEditName("");
  };

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2">
        <Folder className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        <h3 className="text-sm font-bold text-white">Collections</h3>
      </div>

      {/* Create new */}
      <div className="flex items-center gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
          placeholder="New collection name"
          className="border-white/10 bg-white/5 text-sm text-white"
          aria-label="New collection name"
        />
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={!newName.trim()}
          className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
          aria-label="Create collection"
        >
          <FolderPlus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Collection list */}
      {collections.length === 0 ? (
        <p className="text-xs text-slate-400">
          No collections yet. Create one to organize your prompts.
        </p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {collections.map((col) => (
            <div
              key={col.id}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                col.archived
                  ? "border-slate-700 bg-slate-800/30 text-slate-500"
                  : "border-white/10 bg-white/[0.03] text-slate-200"
              }`}
            >
              {editingId === col.id ? (
                <div className="flex flex-1 items-center gap-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleFinishRename(col.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="h-7 border-white/10 bg-white/5 text-xs text-white"
                    autoFocus
                    aria-label="Edit collection name"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => handleFinishRename(col.id)}
                    aria-label="Save name"
                  >
                    <Check className="h-3 w-3 text-emerald-400" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => setEditingId(null)}
                    aria-label="Cancel rename"
                  >
                    <X className="h-3 w-3 text-slate-400" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex flex-1 items-center gap-2 min-w-0">
                    <Folder className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate text-xs font-medium">
                      {col.name}
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-500">
                      {col.promptIds.length}
                    </span>
                    {col.archived ? (
                      <span className="text-[10px] text-slate-500">(archived)</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-0.5">
                    {!col.archived ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleStartRename(col.id, col.name)}
                        aria-label={`Rename ${col.name}`}
                      >
                        <Pencil className="h-3 w-3 text-slate-400" />
                      </Button>
                    ) : null}
                    {col.archived ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => unarchive(col.id)}
                        aria-label={`Unarchive ${col.name}`}
                      >
                        <RotateCcw className="h-3 w-3 text-sky-400" />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => archive(col.id)}
                        aria-label={`Archive ${col.name}`}
                      >
                        <Archive className="h-3 w-3 text-amber-400" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => remove(col.id)}
                      aria-label={`Delete ${col.name}`}
                    >
                      <Trash2 className="h-3 w-3 text-red-400" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

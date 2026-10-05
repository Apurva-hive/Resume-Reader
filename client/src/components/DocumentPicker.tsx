import type { DocumentKind, DocumentSummary } from "../types.js";

type Props = {
  label: string;
  kind: DocumentKind;
  documents: DocumentSummary[];
  value: string;
  onChange: (id: string) => void;
  onDelete: (id: string) => void;
};

export function DocumentPicker({
  label, kind, documents, value, onChange, onDelete,
}: Props) {
  const options = documents.filter((d) => d.kind === kind);

  return (
    <div className="picker">
      <label>
        {label}
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">— select —</option>
          {options.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.title} ({doc.wordCount} words)
            </option>
          ))}
        </select>
      </label>
      {value && (
        <button className="link" onClick={() => onDelete(value)}>
          Delete
        </button>
      )}
    </div>
  );
}
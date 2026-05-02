import { Search, X } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Controlled search input with a clear button.
 * Filters are applied in the parent component.
 */
export function SearchBar({ value, onChange, placeholder = 'Buscar...' }: SearchBarProps) {
  return (
    <div className="relative flex items-center">
      <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9 h-11 rounded-2xl bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:bg-card transition-colors"
        data-testid="input-search"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => onChange('')}
          data-testid="button-search-clear"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

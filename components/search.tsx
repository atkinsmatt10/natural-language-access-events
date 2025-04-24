import { Search as SearchIcon, Key, DoorOpen } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

export const Search = ({
  handleSubmit,
  inputValue,
  setInputValue,
  submitted,
  handleClear,
}: {
  handleSubmit: () => Promise<void>;
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  submitted: boolean;
  handleClear: () => void;
}) => {
  // Example quick filters for access control
  const quickFilters = [
    { icon: <Key className="w-4 h-4" />, label: "Credentials", query: "Show credential type usage distribution" },
    { icon: <DoorOpen className="w-4 h-4" />, label: "Access Patterns", query: "Show hourly access patterns for all doors" },
  ];

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await handleSubmit();
      }}
      className="mb-6"
    >
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="relative flex-grow">
            <Input
              type="text"
              placeholder="Ask about access events, doors, or credentials..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="pr-10 text-base"
            />
            <SearchIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          </div>
          <div className="flex sm:flex-row items-center justify-center gap-2">
            {submitted ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                className="w-full sm:w-auto"
              >
                Clear
              </Button>
            ) : (
              <Button type="submit" className="w-full sm:w-auto">
                Analyze
              </Button>
            )}
          </div>
        </div>
        
        {/* Quick Filters */}
        <div className="flex gap-2 flex-wrap">
          <TooltipProvider>
            {quickFilters.map((filter, index) => (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    onClick={() => setInputValue(filter.query)}
                  >
                    {filter.icon}
                    <span className="hidden sm:inline">{filter.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{filter.query}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </div>

      {/* Optional: Add contextual help */}
      <div className="mt-2 text-xs text-muted-foreground">
        Try asking about access patterns, credential usage, or specific doors
      </div>
    </form>
  );
};
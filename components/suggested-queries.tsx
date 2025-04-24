import { motion } from "framer-motion";
import { Button } from "./ui/button";

export const SuggestedQueries = ({
  handleSuggestionClick,
}: {
  handleSuggestionClick: (suggestion: string) => void;
}) => {
  const suggestionQueries = [
    {
      desktop: "Compare card vs mobile credential usage over the past week",
      mobile: "Card vs mobile",
    },
    {
      desktop: "Which doors have the highest traffic during peak hours?",
      mobile: "Busy doors",
    },
    {
      desktop: "Which users have the most frequent access events?",
      mobile: "Top users",
    },
    {
      desktop: "Show distribution of credential types by door",
      mobile: "Credentials",
    },
    {
      desktop: "Compare first floor vs second floor access frequency",
      mobile: "Floor compare",
    },
    {
      desktop: "Show trend of mobile credential adoption over time",
      mobile: "Mobile trend",
    }
  ];

  return (
    <motion.div
      key="suggestions"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      layout
      exit={{ opacity: 0 }}
      className="h-full overflow-y-auto"
    >
      <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">
        Try these queries:
      </h2>
      <div className="flex flex-wrap gap-2">
        {suggestionQueries.map((suggestion, index) => (
          <Button
            key={index}
            className={index > 5 ? "hidden sm:inline-block" : ""}
            type="button"
            variant="outline"
            onClick={() => handleSuggestionClick(suggestion.desktop)}
          >
            <span className="sm:hidden">{suggestion.mobile}</span>
            <span className="hidden sm:inline">{suggestion.desktop}</span>
          </Button>
        ))}
      </div>
    </motion.div>
  );
};
import { Info } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

export const ProjectInfo = () => {
  return (
    <div className="bg-muted p-4 mt-auto">
      <Alert className="bg-muted text-muted-foreground border-0">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription>
          This demo application allows you to analyze access control events using natural language queries. 
          Ask questions about entry logs, access patterns, and security events across your properties.
        </AlertDescription>
      </Alert>
      <div className="mt-4 flex flex-col items-center text-center text-muted-foreground">
        <div className="text-sm font-medium">
          Smarter living and working, for everyone.
        </div>
        <div className="text-xs mt-1">
          SMRT 2025
        </div>
      </div>
    </div>
  );
};
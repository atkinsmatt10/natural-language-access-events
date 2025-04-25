// header.tsx
import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useEffect, useState } from "react";

export const Header = ({ handleClear }: { handleClear: () => void }) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Logo centered above */}
      <div className="w-full flex justify-center">
        <Image
          src="/smartrent-logo.png" // Make sure to add your logo to the public folder
          alt="SmartRent Logo"
          width={200} // Adjust size as needed
          height={68} // Adjust size as needed
          className="dark:invert" // Inverts logo color in dark mode if needed
        />
      </div>

      {/* Existing header row */}
      <div className="w-full flex items-center justify-between">
        <h1
          className="text-2xl sm:text-3xl font-bold text-foreground flex items-center cursor-pointer"
          onClick={() => handleClear()}
        >
          AI Powered Event Search
        </h1>
        <div className="flex items-center justify-center space-x-2">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "dark" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
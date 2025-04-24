"use client";
import { ReactNode } from 'react';
import { useEffect } from 'react';
import { Config, Result } from "@/lib/types";
import { DynamicChart } from "./dynamic-chart";
import { SkeletonCard } from "./skeleton-card";
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Table,
} from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Smartphone, CreditCard, KeyRound, Fingerprint, Brain, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { CardHeader, CardTitle, Card, CardContent } from "./ui/card";

type SortConfig = {
  key: string | null;
  direction: 'asc' | 'desc';
};

type SortableResult = Record<string, any>;

interface ResultsProps {
  results: Result[];
  columns: string[];
  chartConfig: Config | null;
  generateSummary: (results: Result[], userQuery: string, sqlQuery: string) => Promise<string>;
  userQuery: string;
  sqlQuery: string;
}

export const Results = ({
  results,
  columns,
  chartConfig,
  generateSummary,
  userQuery,
  sqlQuery,
}: ResultsProps): ReactNode => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      if (results.length === 0) return;
      
      setLoadingSummary(true);
      try {
        const summaryText = await generateSummary(results, userQuery, sqlQuery);
        setSummary(summaryText);
      } catch (e) {
        console.error('Error generating summary:', e);
      } finally {
        setLoadingSummary(false);
      }
    };
  
    fetchSummary();
  }, [results, generateSummary, userQuery, sqlQuery]);

  useEffect(() => {
    console.log('Results component mounted with:', {
      resultCount: results.length,
      firstTimestamp: results[0]?.local_timestamp,
      columns
    });
  }, [results, columns]);

  const [sortConfig, setSortConfig] = useState<SortConfig>(() => {
    const timestampColumn = columns.find((col: string) => 
      col.toLowerCase().includes('timestamp') || 
      col.toLowerCase().includes('date')
    );
    return {
      key: timestampColumn || null,
      direction: 'desc'
    };
  });

  const getCredentialTypeDisplay = (type: string) => {
    const iconProps = { 
      className: "inline-block transition-transform group-hover:scale-110", 
      size: 18 
    };
    
    const getStyles = (baseColor: string) => ({
      container: `flex items-center gap-3 py-2 px-3 rounded-md transition-colors group`,
      icon: `text-${baseColor}-500`,
      text: "font-medium tracking-wide"
    });
  
    const getTooltipContent = (type: string) => {
      switch (type.toLowerCase()) {
        case 'mobile':
          return "Smartphone-based credential using the mobile app";
        case 'card':
          return "Physical RFID access card";
        case 'pin':
          return "Personal identification number entered on keypad";
        case 'biometric':
          return "Biometric authentication (fingerprint/face)";
        default:
          return type;
      }
    };
  
    let content;
    switch (type.toLowerCase()) {
      case 'mobile':
        const mobileStyles = getStyles('blue');
        content = (
          <div className={mobileStyles.container}>
            <Smartphone {...iconProps} className={mobileStyles.icon} />
            <span className={mobileStyles.text}>Mobile</span>
          </div>
        );
        break;
      case 'card':
        const cardStyles = getStyles('green');
        content = (
          <div className={cardStyles.container}>
            <CreditCard {...iconProps} className={cardStyles.icon} />
            <span className={cardStyles.text}>Card</span>
          </div>
        );
        break;
      case 'pin':
        const pinStyles = getStyles('yellow');
        content = (
          <div className={pinStyles.container}>
            <KeyRound {...iconProps} className={pinStyles.icon} />
            <span className={pinStyles.text}>PIN</span>
          </div>
        );
        break;
      case 'biometric':
        const bioStyles = getStyles('purple');
        content = (
          <div className={bioStyles.container}>
            <Fingerprint {...iconProps} className={bioStyles.icon} />
            <span className={bioStyles.text}>Biometric</span>
          </div>
        );
        break;
      default:
        content = <span className="py-2 px-3">{type}</span>;
    }

    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent 
            className="bg-secondary text-secondary-foreground px-3 py-1.5 text-sm"
            sideOffset={5}
          >
            <p>{getTooltipContent(type)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const formatColumnTitle = (title: string) => {
    return title
      .split("_")
      .map((word, index) =>
        index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word,
      )
      .join(" ");
  };

  const formatCellValue = (column: string, value: any) => {
    // Handle credential types
    if (column.toLowerCase().includes('credential_type')) {
      return getCredentialTypeDisplay(value);
    }
  
    // Handle dates/timestamps
    if (column.toLowerCase().includes('day') || 
        column.toLowerCase().includes('timestamp') || 
        column.toLowerCase().includes('date')) {
      try {
        if (!value) return 'No Date';
  
        // Parse the date (it's already in the correct timezone)
        const date = new Date(value);
        
        if (isNaN(date.getTime())) {
          console.error('Invalid date:', value);
          return 'Invalid Date';
        }
  
        // Get hours and minutes (already in correct timezone)
        const hours24 = date.getHours();
        const minutes = date.getMinutes();
        
        // Convert to 12-hour format
        const isPM = hours24 >= 12;
        const hours12 = hours24 % 12 || 12;
        const ampm = isPM ? 'PM' : 'AM';
  
        // Format the date and time
        const formattedDate = date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
  
        const formattedTime = `${hours12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  
        return (
          <div className="flex flex-col">
            <span>{formattedDate}</span>
            <span className="text-muted-foreground text-xs">{formattedTime}</span>
          </div>
        );
      } catch (error) {
        console.error('Error formatting date:', {
          error,
          value,
          valueType: typeof value
        });
        return 'Invalid Date Format';
      }
    }
  
    // Handle counts/rates
    if (column.toLowerCase().includes("count") || column.toLowerCase().includes("rate")) {
      const parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) {
        return "0";
      }
      if (column.toLowerCase().includes("rate")) {
        return `${(parsedValue * 100).toFixed(1)}%`;
      }
      return new Intl.NumberFormat().format(parsedValue);
    }
  
    // Default string handling
    return String(value);
  };

  const sortedResults = useMemo(() => {
    if (!sortConfig.key) return results;

    return [...results].sort((a: SortableResult, b: SortableResult) => {
      const key = sortConfig.key as string; // We know it's not null here
      
      // Check if the key exists in both objects
      if (!(key in a) || !(key in b)) {
        return 0;
      }

      const aVal = a[key];
      const bVal = b[key];

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bVal == null) return sortConfig.direction === 'asc' ? 1 : -1;

      // Handle different types of values
      if (key.toLowerCase().includes('timestamp') || 
          key.toLowerCase().includes('date')) {
        const aDate = new Date(aVal).getTime();
        const bDate = new Date(bVal).getTime();
        return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
      }

      // Handle numeric values
      if (!isNaN(Number(aVal)) && !isNaN(Number(bVal))) {
        const aNum = Number(aVal);
        const bNum = Number(bVal);
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // Default string comparison
      return sortConfig.direction === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [results, sortConfig]);

  const handleSort = (column: string) => {
    setSortConfig(current => ({
      key: column,
      direction: current.key === column && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (column: string) => {
    if (!sortConfig.key || sortConfig.key !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  return (
    <div className="flex-grow flex flex-col">
      <Tabs defaultValue="table" className="w-full flex-grow flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger
            value="charts"
            disabled={
              Object.keys(results[0] || {}).length <= 1 || results.length < 2
            }
          >
            Chart
          </TabsTrigger>
        </TabsList>
        <TabsContent value="table" className="flex-grow">
          {(loadingSummary || summary) && (
            <Card className="mb-4 border-muted">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Brain className="h-5 w-5 text-primary/80" />
                <CardTitle className="text-lg font-medium">AI Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSummary ? (
                  <div className="flex items-center space-x-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <div className="space-y-2">
                      <div className="h-4 w-[250px] animate-pulse rounded bg-muted" />
                      <div className="h-4 w-[200px] animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {summary}
                    </p>
                    {userQuery && (
  <p className="text-xs text-muted-foreground/60 italic">
    Based on query: &ldquo;{userQuery}&rdquo;
  </p>
)}  
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          <div className="relative">
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
            <div className="sm:min-h-[10px] relative overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary sticky top-0 shadow-sm">
                  <TableRow>
                    {columns.map((column, index) => (
                      <TableHead
                        key={index}
                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                      >
                        <Button
                          variant="ghost"
                          onClick={() => handleSort(column)}
                          className="hover:bg-transparent h-auto p-0 font-medium"
                        >
                          <span className="flex items-center">
                            {formatColumnTitle(column)}
                            {getSortIcon(column)}
                          </span>
                        </Button>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-card divide-y divide-border">
                  {sortedResults.map((row, index) => (
                    <TableRow key={index} className="hover:bg-muted">
                      {columns.map((column, cellIndex) => (
                        <TableCell
                          key={cellIndex}
                          className="px-4 py-3 text-sm text-foreground"
                        >
                          <div className="max-w-[300px] truncate">
                            {formatCellValue(column, row[column])}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="charts" className="flex-grow overflow-auto">
          <div className="mt-4">
            {chartConfig && results.length > 0 ? (
              <DynamicChart chartData={sortedResults} chartConfig={chartConfig} />
            ) : (
              <SkeletonCard />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
"use client"

import * as React from "react"
import { addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
}

export function DatePickerWithRange({
  className,
  date,
  onDateChange,
}: DatePickerWithRangeProps) {
  // Preset options
  const presets = {
    "this-week": {
      label: "This Week",
      getValue: () => ({
        from: startOfWeek(new Date()),
        to: endOfWeek(new Date())
      })
    },
    "last-7-days": {
      label: "Last 7 Days",
      getValue: () => ({
        from: subDays(new Date(), 7),
        to: new Date()
      })
    },
    "this-month": {
      label: "This Month",
      getValue: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
      })
    },
    "last-month": {
      label: "Last Month",
      getValue: () => ({
        from: startOfMonth(subDays(new Date(), 30)),
        to: endOfMonth(subDays(new Date(), 30))
      })
    },
    "year-to-date": {
      label: "Year to Date",
      getValue: () => ({
        from: startOfYear(new Date()),
        to: new Date()
      })
    }
  }

  const handlePresetChange = (preset: string) => {
    const selectedPreset = presets[preset as keyof typeof presets]
    if (selectedPreset) {
      onDateChange(selectedPreset.getValue())
    }
  }

  const handleDateChange = (newDate: DateRange | undefined) => {
    console.log('Date Picker Change:', newDate);
    onDateChange(newDate);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 space-y-3">
            <Select onValueChange={handlePresetChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a preset range" />
              </SelectTrigger>
              <SelectContent position="popper">
                {Object.entries(presets).map(([key, preset]) => (
                  <SelectItem key={key} value={key}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="border-t pt-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={onDateChange}
                numberOfMonths={2}
                disabled={{ after: new Date() }}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "./utils";
// Tooltip components
export const TooltipProvider = TooltipPrimitive.Provider;

export const Tooltip = TooltipPrimitive.Root;

export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef((props, ref) => {
  const { className, sideOffset = 4, ...rest } = props;
  return (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 rounded-md border px-3 py-1.5 text-sm shadow-md",
        className
      )}
      {...rest}
    />
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
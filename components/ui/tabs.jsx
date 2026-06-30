"use client";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
function Tabs({ className, orientation = "horizontal", ...props }) {
    return (<TabsPrimitive.Root data-slot="tabs" data-orientation={orientation} className={cn("group/tabs flex gap-2 data-horizontal:flex-col", className)} {...props}/>);
}
const tabsListVariants = cva("group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none", {
    variants: {
        variant: {
            default: "border border-primary/20 bg-primary/10 text-primary",
            line: "gap-1 bg-transparent",
        },
    },
    defaultVariants: {
        variant: "default",
    },
});
function TabsList({ className, variant = "default", ...props }) {
    return (<TabsPrimitive.List data-slot="tabs-list" data-variant={variant} className={cn(tabsListVariants({ variant }), className)} {...props}/>);
}
function TabsTrigger({ className, ...props }) {
    return (<TabsPrimitive.Tab data-slot="tabs-trigger" className={cn("relative inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-primary/80 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:bg-primary/10 hover:text-primary focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-sm group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent", "data-active:bg-primary data-active:text-primary-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground", className)} {...props}/>);
}
function TabsContent({ className, ...props }) {
    return (<TabsPrimitive.Panel data-slot="tabs-content" className={cn("flex-1 text-sm outline-none", className)} {...props}/>);
}
export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };

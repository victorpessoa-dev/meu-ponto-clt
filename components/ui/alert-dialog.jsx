"use client";
import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
function AlertDialog({ ...props }) {
    return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props}/>;
}
function AlertDialogTrigger({ ...props }) {
    return (<AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props}/>);
}
function AlertDialogPortal({ ...props }) {
    return (<AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props}/>);
}
function AlertDialogOverlay({ className, ...props }) {
    return (<AlertDialogPrimitive.Backdrop data-slot="alert-dialog-overlay" className={cn("fixed inset-0 isolate z-50 bg-primary/18 duration-150 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 dark:bg-black/45", className)} {...props}/>);
}
function AlertDialogContent({ className, size = "default", ...props }) {
    return (<AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup data-slot="alert-dialog-content" data-size={size} className={cn("group/alert-dialog-content fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-1.5rem)] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto overscroll-contain rounded-2xl border border-border/90 bg-popover p-4 text-popover-foreground shadow-[0_24px_80px_rgba(15,23,42,0.18)] ring-1 ring-border/90 duration-150 outline-none [scrollbar-width:none] sm:p-5 data-[size=default]:max-w-xs data-[size=sm]:max-w-xs data-[size=default]:sm:max-w-sm [&::-webkit-scrollbar]:hidden data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:shadow-none", className)} {...props}/>
    </AlertDialogPortal>);
}
function AlertDialogHeader({ className, ...props }) {
    return (<div data-slot="alert-dialog-header" className={cn("rounded-2xl border border-border/80 bg-accent/30 px-3 py-3 text-center sm:text-left", className)} {...props}/>);
}
function AlertDialogFooter({ className, ...props }) {
    return (<div data-slot="alert-dialog-footer" className={cn("-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-2xl border-t border-border/80 bg-muted/45 p-4 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:-mx-5 sm:-mb-5 sm:flex-row sm:justify-end", className)} {...props}/>);
}
function AlertDialogMedia({ className, ...props }) {
    return (<div data-slot="alert-dialog-media" className={cn("mb-2 inline-flex size-10 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-6", className)} {...props}/>);
}
function AlertDialogTitle({ className, ...props }) {
    return (<AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn("font-heading text-base font-semibold tracking-tight text-foreground sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2", className)} {...props}/>);
}
function AlertDialogDescription({ className, ...props }) {
    return (<AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={cn("mt-1 text-sm text-balance text-muted-foreground md:text-pretty *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground", className)} {...props}/>);
}
function AlertDialogAction({ className, ...props }) {
    return (<Button data-slot="alert-dialog-action" className={cn("min-w-28", className)} {...props}/>);
}
function AlertDialogCancel({ className, variant = "outline", size = "default", ...props }) {
    return (<AlertDialogPrimitive.Close data-slot="alert-dialog-cancel" className={cn(className)} render={<Button variant={variant} size={size} className="min-w-28"/>} {...props}/>);
}
export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogOverlay, AlertDialogPortal, AlertDialogTitle, AlertDialogTrigger, };

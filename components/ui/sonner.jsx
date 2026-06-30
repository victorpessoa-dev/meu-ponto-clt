"use client";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react";
const Toaster = ({ ...props }) => {
    const { theme = "system" } = useTheme();
    return (<Sonner theme={theme} className="toaster group !z-[9999]" icons={{
            success: (<CircleCheckIcon className="size-4 text-positive"/>),
            info: (<InfoIcon className="size-4 text-primary"/>),
            warning: (<TriangleAlertIcon className="size-4 text-chart-3"/>),
            error: (<OctagonXIcon className="size-4 text-negative"/>),
            loading: (<Loader2Icon className="size-4 animate-spin text-primary"/>),
        }} style={{
            "--normal-bg": "color-mix(in oklch, var(--primary) 8%, var(--background))",
            "--normal-text": "var(--primary)",
            "--normal-border": "color-mix(in oklch, var(--primary) 58%, var(--border))",
            "--border-radius": "var(--radius)",
        }} toastOptions={{
            classNames: {
                toast: "cn-toast !z-[9999] !rounded-lg !border !shadow-lg",
                title: "!text-sm !font-semibold",
                description: "!text-xs !text-muted-foreground",
                success: "!border-positive/70 !bg-positive/10 !shadow-positive/10 [&_[data-title]]:!text-positive",
                info: "!border-primary/70 !bg-primary/10 !shadow-primary/10 [&_[data-title]]:!text-primary",
                warning: "!border-chart-3/80 !bg-chart-3/10 !shadow-chart-3/10 [&_[data-title]]:!text-chart-3",
                error: "!border-negative/75 !bg-negative/10 !shadow-negative/10 [&_[data-title]]:!text-negative",
                loading: "!border-primary/70 !bg-primary/10 !shadow-primary/10 [&_[data-title]]:!text-primary",
            },
        }} {...props}/>);
};
export { Toaster };

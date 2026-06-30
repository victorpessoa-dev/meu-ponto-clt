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
                success: "!border-positive/70 !bg-[color-mix(in_oklch,var(--positive)_12%,var(--background))] !shadow-positive/10 [&_[data-title]]:!text-positive",
                info: "!border-primary/70 !bg-[color-mix(in_oklch,var(--primary)_12%,var(--background))] !shadow-primary/10 [&_[data-title]]:!text-primary",
                warning: "!border-chart-3/80 !bg-[color-mix(in_oklch,var(--chart-3)_14%,var(--background))] !shadow-chart-3/10 [&_[data-title]]:!text-chart-3",
                error: "!border-negative/75 !bg-[color-mix(in_oklch,var(--negative)_12%,var(--background))] !shadow-negative/10 [&_[data-title]]:!text-negative",
                loading: "!border-primary/70 !bg-[color-mix(in_oklch,var(--primary)_12%,var(--background))] !shadow-primary/10 [&_[data-title]]:!text-primary",
            },
        }} {...props}/>);
};
export { Toaster };

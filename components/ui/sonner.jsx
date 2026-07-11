"use client";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react";
const Toaster = ({ ...props }) => {
    const { resolvedTheme } = useTheme();
    const sonnerTheme = resolvedTheme === "dark" ? "dark" : "light";
    return (<Sonner theme={sonnerTheme} expand richColors swipeDirections={["left", "right"]} className="toaster group !z-[9999]" icons={{
            success: (<CircleCheckIcon className="size-4 text-positive"/>),
            info: (<InfoIcon className="size-4 text-primary"/>),
            warning: (<TriangleAlertIcon className="size-4 text-chart-3"/>),
            error: (<OctagonXIcon className="size-4 text-negative"/>),
            loading: (<Loader2Icon className="size-4 animate-spin text-primary"/>),
        }} style={{
            "--normal-bg": sonnerTheme === "dark" ? "#142320" : "#ffffff",
            "--normal-text": sonnerTheme === "dark" ? "#edf7f3" : "#12221d",
            "--normal-border": sonnerTheme === "dark" ? "#2b4a41" : "#cfe5dc",
            "--border-radius": "var(--radius)",
        }} toastOptions={{
            classNames: {
                toast: "!z-[9999] !rounded-xl !border !shadow-[0_18px_48px_rgba(15,23,42,0.14)] dark:!shadow-none",
                title: "!text-sm !font-semibold !leading-5",
                description: "!text-xs !leading-5",
            },
        }} {...props}/>);
};
export { Toaster };

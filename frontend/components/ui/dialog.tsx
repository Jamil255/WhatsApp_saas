"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Dialog = (props: DialogPrimitive.Root.Props) => <DialogPrimitive.Root data-slot="dialog" {...props} />;
const DialogTrigger = (props: DialogPrimitive.Trigger.Props) => <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
const DialogClose = (props: DialogPrimitive.Close.Props) => <DialogPrimitive.Close data-slot="dialog-close" {...props} />;

function DialogContent({ className, children, showCloseButton = true, ...props }: DialogPrimitive.Popup.Props & { showCloseButton?: boolean }) {
  return <DialogPrimitive.Portal><DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]" /><DialogPrimitive.Popup data-slot="dialog-content" className={cn("fixed left-1/2 top-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 overflow-hidden rounded-xl border bg-white p-6 text-sm shadow-xl outline-none", className)} {...props}>{children}{showCloseButton && <DialogPrimitive.Close render={<Button variant="ghost" size="icon" className="absolute right-3 top-3 h-8 w-8" />}><X className="h-4 w-4" /><span className="sr-only">Close</span></DialogPrimitive.Close>}</DialogPrimitive.Popup></DialogPrimitive.Portal>;
}

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div data-slot="dialog-header" className={cn("flex flex-col gap-1.5", className)} {...props} />;
const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div data-slot="dialog-footer" className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
const DialogTitle = ({ className, ...props }: DialogPrimitive.Title.Props) => <DialogPrimitive.Title data-slot="dialog-title" className={cn("text-base font-semibold leading-none", className)} {...props} />;
const DialogDescription = ({ className, ...props }: DialogPrimitive.Description.Props) => <DialogPrimitive.Description data-slot="dialog-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger };
